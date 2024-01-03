import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import RoutePath, { isRoutePath } from "./RoutePath"
import QueryString from 'querystring'
import urlFromUri from "./urlFromUri"

export const useRoute2 = () => {
    const url = window.location.href
    const location = useLocation()
    const navigate = useNavigate()

    const [viewUrlBase, setViewUrlBase] = useState<string | undefined>(undefined)

    const p = location.pathname
    const routePath: RoutePath = isRoutePath(p) ? p : '/home'

    // const history = useHistory()
    const qs = location.search.slice(1)
    const query = useMemo(() => (QueryString.parse(qs)), [qs]);
    const viewUri = query.v ? query.v as string : undefined

    useEffect(() => {
        let canceled = false
        if (!viewUri) {
            setViewUrlBase(undefined)
            return
        }
        urlFromUri(viewUri).then((url) => {
            if (canceled) return
            setViewUrlBase(url)
        }).catch((err) => {
            console.warn(err)
            if (canceled) return
            setViewUrlBase(undefined)
        })
        return () => { canceled = true }
    }, [viewUri])
    
    let figureDataUri = query.d ? query.d as string : undefined
    
    // handle case where d query parameter is a json object
    if ((figureDataUri) && (decodeURIComponent(figureDataUri).startsWith('{'))) {
        figureDataUri = 'data:application/json;base64,' + btoa(decodeURIComponent(figureDataUri))
    }

    const label = query.label ? query.label as any as string : ''
    const zone: string | undefined = query.zone ? query.zone as any as string : undefined
    const sh: string | undefined = query.sh ? query.sh as any as string : undefined
    const dir: string | undefined = query.dir ? query.dir as any as string : undefined

    const setRoute = useCallback((o: {routePath?: RoutePath, dataUri?: string, label?: string}) => {
        // const query2 = {...query}
        const query2: {[key: string]: string} = {}
        let pathname2 = location.pathname
        if (o.routePath) pathname2 = o.routePath
        if (o.dataUri !== undefined) {
            if (o.dataUri) query2.d = o.dataUri
            else delete query2['d']
        }
        if (o.label !== undefined) {
            if (o.label) query2.label = o.label
            else delete query2['label']
        }
        const search2 = queryString(query2)
        navigate({...location, pathname: pathname2, search: search2})
    }, [location, navigate])

    const viewUrl = viewUrlBase ? (
        !viewUrlBase.endsWith('.html') && !viewUrlBase.endsWith('.htm') ? (
            viewUrlBase + '/index.html'
        ) : (
            viewUrlBase
        )
     ) : undefined

    return {url, routePath, setRoute, queryString: qs, viewUri, viewUrl, viewUrlBase, figureDataUri, label, zone, sh, dir}
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