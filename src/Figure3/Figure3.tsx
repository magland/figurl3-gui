import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoute2 } from "../Route/useRoute2";
import QueryString from 'querystring'
import { randomAlphaLowerString, randomAlphaString } from "../randomAlphaString";
import communicateWithFigureWindow from "./communicateWithFigureWindow";
import getZoneInfo from "./getZoneInfo";
import { useGithubAuth } from "../GithubAuth/useGithubAuth";

type Props = {
    width: number
    height: number
}

const Figure3: FunctionComponent<Props> = ({width, height}) => {
    const {viewUrl, figureDataUri, zone} = useRoute2()
    const qs = location.search.slice(1)
    const query = useMemo(() => (QueryString.parse(qs)), [qs]);

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
        const cancel = communicateWithFigureWindow(iframeElement, {figureId, figureDataUri, kacheryGatewayUrl, githubAuth, zone})
        return cancel
    }, [iframeElement, figureDataUri, figureId, kacheryGatewayUrl, githubAuth, zone])
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

export default Figure3