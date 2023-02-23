import { JSONStringifyDeterministic } from '@figurl/interface/dist/viewInterface/kacheryTypes';
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

const Figure3: FunctionComponent<Props> = ({width, height}) => {
    const {viewUrl, figureDataUri, zone} = useRoute2()
    const qs = window.location.search.slice(1)
    const query = useMemo(() => (QueryString.parse(qs)), [qs]);

    const {visible: authorizePermissionsWindowVisible, handleOpen: openAuthorizePermissionsWindow, handleClose: closeAuthorizePermissionsWindow} = useModalDialog()

    const location = useLocation()
    const navigate = useNavigate()

    // need to do this so that onSetUrlState does not have a dependency on location
    const locationRef = useRef<Location>()
    useEffect(() => {
        locationRef.current = location
    }, [location])

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

    const [iframeElement, setIframeElement] = useState<HTMLIFrameElement | null>()
    const figureId = useMemo(() => (randomAlphaLowerString(10)), [])

    const src = useMemo(() => {
        if (!viewUrl) return ''
        const parentOrigin = window.location.protocol + '//' + window.location.host
        let src = `${viewUrl}?parentOrigin=${parentOrigin}&figureId=${figureId}`
        if (query.s) {
            src += `&s=${query.s}`
        }
        return src
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
                rtcshareFileSystemClient
            }
        )
        iframeElement.src = src
        return cancel
    }, [iframeElement, figureDataUri, figureId, kacheryGatewayUrl, zone, onSetUrlState, verifyPermissions, src, rtcshareFileSystemClient])

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