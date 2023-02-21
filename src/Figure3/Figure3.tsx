import QueryString from 'querystring';
import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Location, useLocation, useNavigate } from "react-router-dom";
import { useGithubAuth } from "../GithubAuth/useGithubAuth";
import { randomAlphaLowerString } from "../randomAlphaString";
import { useRoute2 } from "../Route/useRoute2";
import communicateWithFigureWindow from "./communicateWithFigureWindow";
import getZoneInfo from "./getZoneInfo";

type Props = {
    width: number
    height: number
}

const Figure3: FunctionComponent<Props> = ({width, height}) => {
    const {viewUrl, figureDataUri, zone} = useRoute2()
    const qs = window.location.search.slice(1)
    const query = useMemo(() => (QueryString.parse(qs)), [qs]);

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
                console.log(`--- setting kachery gateway url: ${resp.kacheryGatewayUrl}`)
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

    const [iframeElement, setIframeElement] = useState<HTMLIFrameElement | null>()
    const figureId = useMemo(() => (randomAlphaLowerString(10)), [])
    useEffect(() => {
        // if (iframeElement.current) return // already set
        if (!figureDataUri) {
            console.warn('No data URI')
            return
        }
        if (!iframeElement) return
        if (!kacheryGatewayUrl) return
        const cancel = communicateWithFigureWindow(iframeElement, {figureId, figureDataUri, kacheryGatewayUrl, githubAuth, zone, onSetUrlState})
        return cancel
    }, [iframeElement, figureDataUri, figureId, kacheryGatewayUrl, githubAuth, zone, onSetUrlState])
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
    return (
        <iframe
            ref={e => {setIframeElement(e)}}
            title="figure"
            src={src}
            width={width}
            height={height}
            frameBorder="0"
        />
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