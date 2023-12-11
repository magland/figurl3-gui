import { JSONStringifyDeterministic } from '@figurl/interface/dist/viewInterface/kacheryTypes';
import { ReportUrlStateChangeMessage } from '@figurl/interface/dist/viewInterface/MessageToChildTypes';
import QueryString from 'querystring';
import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Location, useLocation, useNavigate } from "react-router-dom";
import ModalWindow from '../components/ModalWindow/ModalWindow';
import { useGithubAuth } from "../GithubAuth/useGithubAuth";
import { useModalDialog } from '../MainWindow/ApplicationBar';
import { randomAlphaLowerString } from "../randomAlphaString";
import { useRoute2 } from "../Route/useRoute2";
import { serviceBaseUrl } from '../Rtcshare/config';
import { useRtcshare } from '../Rtcshare/useRtcshare';
import communicateWithFigureWindow from "./communicateWithFigureWindow";
import getZoneInfo from "./getZoneInfo";
import GitHubPermissionsWindow from './GitHubPermissionsWindow';
import PermissionsWindow from './PermissionsWindow';
import RtcsharePermissionsWindow from './RtcsharePermissionsWindow';
import sleepMsec from './sleepMsec';

type Props = {
    width: number
    height: number
}

function parseQuery(queryString: string) {
    const ind = queryString.indexOf('?')
    if (ind <0) return {}
    const query: {[k: string]: string} = {};
    const pairs = queryString.slice(ind + 1).split('&');
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}

// Important to do it this way because it is difficult to handle special characters (especially #) by using URLSearchParams or window.location.search
const queryParams = parseQuery(window.location.href)

const parentOrigin = window.location.protocol + '//' + window.location.host

const Figure3: FunctionComponent<Props> = ({width, height}) => {
    const {viewUrl, figureDataUri, zone, dir} = useRoute2()

    const {visible: authorizePermissionsWindowVisible, handleOpen: openAuthorizePermissionsWindow, handleClose: closeAuthorizePermissionsWindow} = useModalDialog()

    const [iframeElement, setIframeElement] = useState<HTMLIFrameElement | null>()

    const location = useLocation()
    const navigate = useNavigate()

    const figureId = useMemo(() => (randomAlphaLowerString(10)), [])

    // need to do this so that onSetUrlState does not have a dependency on location
    const locationRef = useRef<Location>()
    useEffect(() => {
        let canceled = false
        locationRef.current = location

        let receivedInitialMessageFromChild = false
        const listener = (e: MessageEvent) => {
            if (receivedInitialMessageFromChild) return
            const msg = e.data
            if (msg.figureId !== figureId) return
            receivedInitialMessageFromChild = true
            console.info('Received initial message from child')
        }
        addEventListener('message', listener)

        if ((iframeElement) && (iframeElement.contentWindow)) {
            const queryParams0 = parseQuery(location.search)
            if (queryParams0.s) {
                const msg: ReportUrlStateChangeMessage = {
                    type: 'reportUrlStateChange',
                    state: JSON.parse(queryParams0.s)
                }   
                iframeElement.contentWindow.postMessage(msg, '*')
            }
            const s = queryParams.s ? encodeURIComponent(queryParams.s) : undefined

            ; (async () => {
                // keep trying to send initialization message to child until we get a response
                // try until 30 seconds have elapsed, with rate slowing down

                if (!iframeElement.contentWindow) return
                const timer = Date.now()
                // eslint-disable-next-line no-constant-condition
                while (!receivedInitialMessageFromChild) {
                    if (receivedInitialMessageFromChild) break
                    iframeElement.contentWindow.postMessage({type: 'initializeFigure', parentOrigin, figureId, s}, '*')
                    const elapsed = Date.now() - timer
                    if (elapsed > 30000) {
                        console.warn('Timed out waiting for response from iframe')
                        break
                    }
                    if (elapsed < 300) {
                        await sleepMsec(50)
                    }
                    else if (elapsed < 1000) {
                        await sleepMsec(200)
                    }
                    else if (elapsed < 5000) {
                        await sleepMsec(500)
                    }
                    else if (elapsed < 100000) {
                        await sleepMsec(5000)
                    }
                }
            })()
        }
        return () => {   
            canceled = true
            removeEventListener('message', listener)
        }
    }, [iframeElement,iframeElement?.contentWindow, location, figureId])

    const githubAuth = useGithubAuth()

    const [kacheryGatewayUrl, setKacheryGatewayUrl] = useState<string>()
    useEffect(() => {
        if (zone) {
            getZoneInfo(zone).then(resp => {
                if (!resp.found) {
                    throw Error(`Unrecognized zone: ${zone}`)
                }
                setKacheryGatewayUrl(resp.kacheryGatewayUrl)
            })
        }
        else {
            setKacheryGatewayUrl(`https://kachery-gateway.figurl.org`)
        }
    }, [zone])

    const onSetUrlState = useCallback((state: {[k: string]: any}) => {
        if (!locationRef.current) return
        const newLocation = {
            ...locationRef.current,
            search: adjustQueryStringForState(locationRef.current.search, state)
        }
        navigate(newLocation)
    }, [navigate])

    const authorizedPermissionsRef = useRef<{[k: string]: boolean | undefined}>({})
    const [authorizePermissionsData, setAuthorizePermissionsData] = useState<{purpose: 'store-file' | 'store-github-file' | 'store-rtcshare-file', params: any}>()
    const onRequestPermissions = useCallback((purpose: 'store-file' | 'store-github-file' | 'store-rtcshare-file', params: any) => {
        setAuthorizePermissionsData({purpose, params})
        openAuthorizePermissionsWindow()
    }, [setAuthorizePermissionsData, openAuthorizePermissionsWindow])

    const verifyPermissions = useMemo(() => {
        return async (purpose: 'store-file' | 'store-github-file' | 'store-rtcshare-file', params: any): Promise<boolean> => {
            const k = `${purpose}.${JSONStringifyDeterministic(params)}`
            if (authorizedPermissionsRef.current[k] === true) return true
            authorizedPermissionsRef.current[k] = undefined
            onRequestPermissions(purpose, params)
            // eslint-disable-next-line no-constant-condition
            while (true) {
                if (authorizedPermissionsRef.current[k] !== undefined) return (authorizedPermissionsRef.current[k] || false)
                await sleepMsec(200)
            }
        }
    }, [onRequestPermissions])

    const src = useMemo(() => {
        if (!viewUrl) return ''

        // NOTE: we used to pass figureId and parentOrigin as query parameters, but now we pass them as messages
        // This is because sometimes the child window url gets redirected (e.g., by unpkg) and then the query parameters get lost

        // however, to support old figurl links that don't support the message version of the protocol,
        // we still need to pass the figureId and parentOrigin as query parameters
        // but we won't do it in the new recommended way of doing things, using npm:// urls
        // to make sure that we are not relying on the query method

        if (viewUrl.startsWith('npm://')) {
            return viewUrl // no query parameters
        }
        else {
            // as mentioned above, we need to pass query parameters for backwards compatibility with very old figurl links
            let src = `${viewUrl}?parentOrigin=${parentOrigin}&figureId=${figureId}`
            if (queryParams.s) {
                src += `&s=${encodeURIComponent(queryParams.s)}`
            }
            return src
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [figureId, viewUrl]) // intentionally exclude query.s from dependencies so we don't get a refresh when state changes

    const {client: rtcshareFileSystemClient} = useRtcshare()

    const githubAuthRef = useRef<{userId?: string, accessToken?: string} | undefined>()
    useEffect(() => {
        githubAuthRef.current = githubAuth
    }, [githubAuth])

    useEffect(() => {
        // if (iframeElement.current) return // already set
        if (!iframeElement) return
        if (!kacheryGatewayUrl) return
        if ((!rtcshareFileSystemClient) && (serviceBaseUrl)) return
        const cancel = communicateWithFigureWindow(
            iframeElement,
            {
                figureId,
                figureDataUri,
                kacheryGatewayUrl,
                githubAuthRef,
                zone,
                onSetUrlState,
                verifyPermissions,
                rtcshareFileSystemClient,
                rtcshareBaseDir: dir?.startsWith('rtcshare://') ? dir : undefined
            }
        )
        iframeElement.src = src
        return cancel
    }, [iframeElement, figureDataUri, figureId, kacheryGatewayUrl, zone, onSetUrlState, verifyPermissions, src, rtcshareFileSystemClient, dir])

    return (
        <div style={{position: 'absolute', width, height, overflow: 'hidden'}}>
            <iframe
                ref={e => {setIframeElement(e)}}
                title="figure"
                width={width}
                height={height}
                frameBorder="0"
            />
            <ModalWindow
                open={authorizePermissionsWindowVisible && (authorizePermissionsData?.purpose === 'store-file')}
                onClose={undefined}
            >
                <PermissionsWindow
                    onClose={closeAuthorizePermissionsWindow}
                    authorizedPermissionsRef={authorizedPermissionsRef}
                />
            </ModalWindow>
            <ModalWindow
                open={authorizePermissionsWindowVisible && (authorizePermissionsData?.purpose === 'store-github-file')}
                onClose={undefined}
            >
                <GitHubPermissionsWindow
                    onClose={closeAuthorizePermissionsWindow}
                    params={authorizePermissionsData?.params || {}}
                    authorizedPermissionsRef={authorizedPermissionsRef}
                />
            </ModalWindow>
            <ModalWindow
                open={authorizePermissionsWindowVisible && (authorizePermissionsData?.purpose === 'store-rtcshare-file')}
                onClose={undefined}
            >
                <RtcsharePermissionsWindow
                    onClose={closeAuthorizePermissionsWindow}
                    params={authorizePermissionsData?.params || {}}
                    authorizedPermissionsRef={authorizedPermissionsRef}
                />
            </ModalWindow>
        </div>
    )
}

const adjustQueryStringForState = (querystr: string, state: {[key: string]: any}) => {
    const qs = querystr.slice(1)
    const query = QueryString.parse(qs)
    return queryString({
        ...query,
        s: JSON.stringify(state)
    })
}

const queryString = (params: { [key: string]: string | string[] }) => {
    const keys = Object.keys(params)
    if (keys.length === 0) return ''
    return '?' + (
        keys.map((key) => {
            const v = params[key]
            if (typeof(v) === 'string') {
                return encodeURIComponent(key) + '=' + v
            }
            else {
                return v.map(a => (encodeURIComponent(key) + '=' + a)).join('&')
            }
        }).join('&')
    )
}

export default Figure3