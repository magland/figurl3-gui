import { FigurlRequest, FigurlResponse, isFigurlRequest, RDDir, StoreGithubFileResponse as StoreGithubFileResponseFigurl } from "./viewInterface/FigurlRequestTypes"
import { FileDownloadProgressMessage, SetCurrentUserMessage } from "./viewInterface/MessageToChildTypes"
import axios from "axios"
import QueryString from 'querystring'
import { MutableRefObject } from "react"
import { getGitHubTokenInfoFromLocalStorage } from "../GithubAuth/getGithubAuthFromLocalStorage"
import { localKacheryServerBaseUrl, localKacheryServerIsAvailable, localKacheryServerIsEnabled } from "../MainWindow/LocalKacheryDialog"
import RtcshareFileSystemClient from "../Rtcshare/RtcshareDataManager/RtcshareFileSystemClient"
import { signMessage } from "./crypto/signatures"
import deserializeReturnValue from "./deserializeReturnValue"
import { StoreFileRequest, StoreFileResponse, StoreGithubFileRequest, StoreGithubFileResponse } from "./viewInterface/FigurlRequestTypes"
import { FindFileRequest, isFindFileResponse } from "./GatewayRequest"
import { getKacheryCloudClientInfo } from "./getKacheryCloudClientInfo"
import kacheryCloudStoreFile from "./kacheryCloudStoreFile"
import sleepMsec from "./sleepMsec"
import storeGithubFile, { loadGitHubFileDataFromUri, parseGitHubFileUri } from "./storeGithubFile"
import { RtcshareDir } from "../Rtcshare/RtcshareRequest"

const messageListeners: {[figureId: string]: (msg: any) => void} = {}

function addMessageListener(figureId: string, callback: (msg: any) => void) {
    messageListeners[figureId] = callback
}

window.addEventListener('message', (e: MessageEvent) => {
    const msg = e.data
    if ((msg) && (msg.type === 'figurlRequest')) {
        if (msg.figureId in messageListeners) {
            messageListeners[msg.figureId](msg)
        }
    }
})

const communicateWithFigureWindow = (
    e: HTMLIFrameElement,
    o: {
        figureId: string,
        figureDataUri?: string,
        kacheryGatewayUrl: string,
        githubAuthRef: MutableRefObject<{userId?: string, accessToken?: string} | undefined>,
        zone?: string,
        onSetUrlState: (state: {[k: string]: any}) => void,
        verifyPermissions: (purpose: 'store-file' | 'store-github-file' | 'store-rtcshare-file', params: any) => Promise<boolean>,
        rtcshareFileSystemClient: RtcshareFileSystemClient | undefined,
        rtcshareBaseDir?: string
    }
) => {
    const {figureId, figureDataUri, kacheryGatewayUrl, githubAuthRef, zone, verifyPermissions, rtcshareFileSystemClient} = o
    const contentWindow = e.contentWindow
    if (!contentWindow) {
        console.warn('No contentWindow on iframe element')
        return
    }
    let rtcshareBaseDir: string | undefined = undefined
    if (o.rtcshareBaseDir) {
        rtcshareBaseDir = o.rtcshareBaseDir
    }
    else if ((figureDataUri || '').startsWith('rtcshare://')) {
        const aa = (figureDataUri || '').split('/')
        rtcshareBaseDir = aa.slice(0, aa.length - 1).join('/')
    }
    addMessageListener(figureId, (msg: any) => {
        ;(async () => {
            const req = msg.request
            if (isFigurlRequest(req)) {
                const response = await _handleFigurlRequest(req)
                if (response) {
                    contentWindow.postMessage({
                        type: 'figurlResponse',
                        requestId: msg.requestId,
                        response
                    }, '*')
                }
            }
            else {
                console.warn(req)
                console.warn('Invalid figurl request from window **')
            }
        })()
    })
    const _handleFigurlRequest = async (req: FigurlRequest): Promise<FigurlResponse | undefined> => {
        const handleStoreFileRequest = async (req: StoreFileRequest): Promise<StoreFileResponse> => {
            if ((req.uri) && (req.uri.startsWith('rtcshare://'))) {
                return await handleStoreRtcshareFileRequest(req)
            }
            if (!(await verifyPermissions('store-file', {}))) {
                return {
                    type: 'storeFile',
                    uri: undefined
                }
            }
            
            const {fileData} = req
            const uri = await kacheryCloudStoreFile(fileData, kacheryGatewayUrl, githubAuthRef.current, zone || 'default')
            if (!uri) throw Error('Error storing file')
            return {
                type: 'storeFile',
                uri
            }
        }
        const handleStoreGithubFileRequest = async (req: StoreGithubFileRequest): Promise<StoreGithubFileResponse> => {
            const {fileData, uri} = req
            if (!uri.startsWith('gh://')) {
                throw Error(`Invalid github URI: ${uri}`)
            }
            if (!(await verifyPermissions('store-github-file', {uri}))) {
                return {
                    type: 'storeGithubFile',
                    success: false,
                    error: 'Permission not granted'
                }
            }
            const storeHelper = async (uri: string, fileData: ArrayBuffer): Promise<StoreGithubFileResponseFigurl> => {
                const githubTokenInfo = getGitHubTokenInfoFromLocalStorage()
                if (!githubTokenInfo?.token) {
                    return {
                        type: 'storeGithubFile',
                        success: false,
                        error: 'No github token'
                    }
                }
                try {
                    await storeGithubFile({fileData, uri})
                }
                catch(err: any) {
                    return {
                        type: 'storeGithubFile',
                        success: false,
                        error: `Error storing github file: ${err.message}`
                    }
                }
                return {
                    type: 'storeGithubFile',
                    success: true
                }
            }
            const {fileName} = parseGitHubFileUri(uri)
            if (fileName.endsWith('.uri')) {
                // store file in kachery-cloud, get the URI and store that on github (because the file ends with .uri)
                const {uri: uri2} = await handleStoreFileRequest({type: 'storeFile', fileData})
                if (uri2) {
                    return await storeHelper(uri, str2ab(uri2))
                }
                else {
                    return {
                        type: 'storeGithubFile',
                        success: false,
                        error: 'Problem storing file in kachery'
                    }
                }
            }
            else {
                return await storeHelper(uri, str2ab(fileData))
            }
        }

        const handleStoreRtcshareFileRequest = async (req: StoreFileRequest) : Promise<StoreFileResponse> => {
            const uri = req.uri || ''
            if (!uri.startsWith('rtcshare://')) throw Error('Unexpected')
            if (!(await verifyPermissions('store-rtcshare-file', {uri}))) {
                return {
                    type: 'storeFile',
                    error: 'Permission not granted'
                }
            }
            if (!rtcshareFileSystemClient) {
                return {
                    type: 'storeFile',
                    error: 'Not connected to an rtcshare'
                }
            }
            if (!githubAuthRef.current) throw Error('Not signed in with GitHub')
            const path = uri.slice('rtcshare://'.length)
            const fileData = (new TextEncoder()).encode(req.fileData).buffer
            try {
                await rtcshareFileSystemClient.writeFile(
                    path,
                    fileData,
                    githubAuthRef.current
                )
                return {
                    type: 'storeFile',
                    uri
                }
            }
            catch(err: any) {
                return {
                    type: 'storeFile',
                    error: `Error writing file: ${err.message}`
                }
            }
        }

        if (req.type === 'getFigureData') {
            if (!figureDataUri) {
                return {
                    type: 'getFigureData',
                    figureData: {}
                }
            }
            if (!req.figurlProtocolVersion) {
                // old way for old figures (which includes deserialization of return value)
                const a = await _loadFileFromUri(figureDataUri, undefined, undefined, () => {}, {kacheryGatewayUrl, githubAuth: githubAuthRef.current, zone, name: 'root', rtcshareFileSystemClient, rtcshareBaseDir})
                if (!a) return
                const dec = new TextDecoder()
                const figureData = await deserializeReturnValue(JSON.parse(dec.decode(a.arrayBuffer)))
                return {
                    type: 'getFigureData',
                    figureData
                }
            }
            else if (req.figurlProtocolVersion === 'p1') {
                // protocol p1
                const a = await _loadFileFromUri(figureDataUri, undefined, undefined, () => {}, {kacheryGatewayUrl, githubAuth: githubAuthRef.current, zone, name: 'root', rtcshareFileSystemClient, rtcshareBaseDir})
                if (!a) return
                const dec = new TextDecoder()
                const figureData = JSON.parse(dec.decode(a.arrayBuffer))
                return {
                    type: 'getFigureData',
                    figureData
                }
            }
            else {
                throw Error(`Unexpected figurl protocol version: ${req.figurlProtocolVersion}`)
            }
        }
        else if (req.type === 'getFileData') {
            if (!req.figurlProtocolVersion) {
                // old way for old figures (which includes option of deserialization of return value)
                const onProgress = (a: {loaded: number, total: number}) => {
                    const mm: FileDownloadProgressMessage = {
                        type: 'fileDownloadProgress',
                        uri: req.uri,
                        loaded: a.loaded,
                        total: a.total
                    }
                    contentWindow.postMessage(mm, '*')
                }
                let a: {
                    arrayBuffer: ArrayBuffer
                    size?: number
                    foundLocally: boolean
                } | undefined
                try {
                    a = await _loadFileFromUri(req.uri, req.startByte, req.endByte, onProgress, {kacheryGatewayUrl, githubAuth: githubAuthRef.current, zone, rtcshareFileSystemClient, rtcshareBaseDir})
                }
                catch(err: any) {
                    return {
                        type: 'getFileData',
                        errorMessage: `Error loading file data: ${err.message}`
                    }
                }
                if (!a) {
                    return {
                        type: 'getFileData',
                        errorMessage: `Unable to load file data: ${req.uri}`
                    }
                }
                const rt = req.responseType || 'json-deserialized'
                let fileData
                const dec = new TextDecoder()
                if (rt === 'json-deserialized') {
                    if (req.startByte !== undefined) {
                        throw Error('Cannot use startByte/endByte for json-serialized response type')
                    }
                    fileData = await deserializeReturnValue(JSON.parse(dec.decode(a?.arrayBuffer)))
                }
                else if (rt === 'json') {
                    if (req.startByte !== undefined) {
                        throw Error('Cannot use startByte/endByte for json response type')
                    }
                    fileData = JSON.parse(dec.decode(a.arrayBuffer))
                }
                else if (rt === 'binary') {
                    fileData = a.arrayBuffer
                }
                else { // text
                    fileData = dec.decode(a.arrayBuffer)
                }
                return {
                    type: 'getFileData',
                    fileData
                }
            }
            else if (req.figurlProtocolVersion === 'p1') {
                // protocol p1
                const onProgress = (a: {loaded: number, total: number}) => {
                    const mm: FileDownloadProgressMessage = {
                        type: 'fileDownloadProgress',
                        uri: req.uri,
                        loaded: a.loaded,
                        total: a.total
                    }
                    contentWindow.postMessage(mm, '*')
                }
                let a: {
                    arrayBuffer: ArrayBuffer
                    size?: number
                    foundLocally: boolean
                } | undefined
                try {
                    a = await _loadFileFromUri(req.uri, req.startByte, req.endByte, onProgress, {kacheryGatewayUrl, githubAuth: githubAuthRef.current, zone, rtcshareFileSystemClient, rtcshareBaseDir})
                }
                catch(err: any) {
                    return {
                        type: 'getFileData',
                        errorMessage: `Error loading file data: ${err.message}`
                    }
                }
                if (!a) {
                    return {
                        type: 'getFileData',
                        errorMessage: `Unable to load file data: ${req.uri}`
                    }
                }
                const rt = req.responseType || 'json'
                if (req.responseType === 'json-deserialized') {
                    throw Error('Unexpected response type for protocol p1: json-deserialized')
                }
                let fileData
                const dec = new TextDecoder()
                if (rt === 'json') {
                    if (req.startByte !== undefined) {
                        throw Error('Cannot use startByte/endByte for json response type')
                    }
                    fileData = JSON.parse(dec.decode(a.arrayBuffer))
                }
                else if (rt === 'binary') {
                    fileData = a.arrayBuffer
                }
                else { // text
                    fileData = dec.decode(a.arrayBuffer)
                }
                return {
                    type: 'getFileData',
                    fileData
                }
            }
            else {
                throw Error(`Unexpected figurl protocol version: ${req.figurlProtocolVersion}`)
            }
        }
        else if (req.type === 'getFileDataUrl') {
            if (!req.figurlProtocolVersion) {
                // old way for old figures
                const aa = await _getFileUrlFromUri(req.uri, {kacheryGatewayUrl, githubAuth: githubAuthRef.current, zone})
                if (!aa) return {
                    type: 'getFileDataUrl',
                    errorMessage: `Unable to get file URL from URI: ${req.uri}`
                }
                return {
                    type: 'getFileDataUrl',
                    fileDataUrl: aa.url
                }
            }
            else if (req.figurlProtocolVersion === 'p1') {
                // protocol p1 - actually no different from old way
                const aa = await _getFileUrlFromUri(req.uri, {kacheryGatewayUrl, githubAuth: githubAuthRef.current, zone})
                if (!aa) return {
                    type: 'getFileDataUrl',
                    errorMessage: `Unable to get file URL from URI: ${req.uri}`
                }
                return {
                    type: 'getFileDataUrl',
                    fileDataUrl: aa.url
                }
            }
            else {
                throw Error(`Unexpected figurl protocol version: ${req.figurlProtocolVersion}`)
            }
        }
        else if (req.type === 'setUrlState') {
            o.onSetUrlState(req.state)
            return {
                type: 'setUrlState'
            }
        }
        else if (req.type === 'storeFile') {
            return await handleStoreFileRequest(req)
        }
        else if (req.type === 'storeGithubFile') {
            return await handleStoreGithubFileRequest(req)
        }
        else if (req.type === 'readDir') {
            let {uri} = req
            if (uri === '$dir') {
                if (!rtcshareBaseDir) {
                    throw Error('No rtcshare base dir.')
                }
                uri = rtcshareBaseDir
            }
            else if (uri.startsWith('$dir/')) {
                if (!rtcshareBaseDir) {
                    throw Error('No rtcshare base dir.')
                }
                if (rtcshareBaseDir === 'rtcshare://') {
                    uri = 'rtcshare://' + uri.slice('$dir/'.length)
                }
                else {
                    uri = rtcshareBaseDir + '/' + uri.slice('$dir/'.length)
                }
            }
            if (uri.startsWith('rtcshare://')) {
                if (!rtcshareFileSystemClient) {
                    throw Error('No rtcshare client')
                }
                const ppath = uri.slice('rtcshare://'.length)
                const dir = await rtcshareFileSystemClient.readDir(ppath, {forceReload: true})
                const convertDir = (dir1: RtcshareDir): RDDir => {
                    return {
                        name: dir1.name,
                        files: (dir1.files || []).map(f => ({name: f.name, size: f.size, mtime: f.mtime})),
                        dirs: (dir1.dirs || []).map(d => (convertDir(d)))
                    }
                }
                return {
                    type: 'readDir',
                    dir: convertDir(dir)
                }
            }
            else {
                throw Error(`Unexpected data URI: ${uri}`)
            }
        }
        else if (req.type === 'serviceQuery') {
            if (!rtcshareFileSystemClient) {
                throw Error('No rtcshare client')
            }
            try {
                const userId = req.includeUserId ? o.githubAuthRef.current?.userId : undefined
                const {result, binaryPayload} = await rtcshareFileSystemClient.serviceQuery(req.serviceName, req.query, o.rtcshareBaseDir, userId)
                return {
                    type: 'serviceQuery',
                    result,
                    binaryPayload
                }
            }
            catch(err: any) {
                return {
                    type: 'serviceQuery',
                    errorMessage: err.message
                }
            }
        }
    }
    let canceled = false
    ; (async () => {
        const postGithubUserMessage = () => {
            const githubAuth = githubAuthRef.current
            const msg: SetCurrentUserMessage = {
                type: 'setCurrentUser',
                userId: githubAuth && githubAuth.userId ? githubAuth.userId : undefined
            }
            contentWindow.postMessage(msg, '*')
        }

        // important to do this multiple times because the window might not be loaded right from the outset
        // in the future we can handle this differently by sending it immediately after receiving the first message from the child window
        for (let i = 0; i < 5; i++) {
            if (canceled) return
            postGithubUserMessage()
            await sleepMsec(1000)
        }

        // then we also need to send any updates (this is worse than desired)
        let lastGithubAuth = githubAuthRef.current
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (canceled) return
            if (githubAuthRef.current !== lastGithubAuth) {
                console.info('GitHub user changed, posting message to child window')
                postGithubUserMessage()
                lastGithubAuth = githubAuthRef.current
            }
            await sleepMsec(1000)
        }
    })()
    return () => {
        canceled = true
        delete messageListeners[figureId]
    }
}

export const requestedFileUris: string[] = []
export const requestedFiles: {[uri: string]: {name?: string, size?: number}} = {}

const _getFileUrlFromUri = async (uri: string, o: {kacheryGatewayUrl: string, githubAuth?: {userId?: string, accessToken?: string}, zone?: string, name?: string}): Promise<{url: string, size?: number, foundLocally: boolean, sha1: string} | undefined> => {
    const {kacheryGatewayUrl, githubAuth, zone} = o
    if (uri.startsWith('sha1://')) {
        const a = uri.split('?')[0].split('/')
        const sha1 = a[2]
        const queryStr = a[3] || ''
        const query = QueryString.parse(queryStr)
        const aa = await getFileDownloadUrl('sha1', sha1, kacheryGatewayUrl, githubAuth, zone)
        if (!aa) return undefined
        const {url, size, foundLocally} = aa
        requestedFiles[uri] = {size, name: o.name || (query.label as string) || undefined}
        return {url, size, foundLocally, sha1}
    }
    else if (uri.startsWith('http://') || uri.startsWith('https://')) {
        return {url: uri, foundLocally: false, sha1: ''}
    }
    else return undefined
}

const _loadFileFromUri = async (uri: string, startByte: number | undefined, endByte: number | undefined, onProgress: (a: {loaded: number, total: number}) => void, o: {kacheryGatewayUrl: string, githubAuth?: {userId?: string, accessToken?: string}, zone?: string, name?: string, rtcshareFileSystemClient: RtcshareFileSystemClient | undefined, rtcshareBaseDir?: string}): Promise<{arrayBuffer: ArrayBuffer, size?: number, foundLocally: boolean} | undefined> => {
    if (uri === '$dir') {
        if (!o.rtcshareBaseDir) {
            throw Error('No rtcshare base dir.')
        }
        uri = o.rtcshareBaseDir
    }
    if (uri.startsWith('$dir/')) {
        if (!o.rtcshareBaseDir) {
            throw Error('No rtcshare base dir.')
        }
        if (o.rtcshareBaseDir === 'rtcshare://') {
            uri = 'rtcshare://' + uri.slice('$dir/'.length)
        }
        else {
            uri = o.rtcshareBaseDir + '/' + uri.slice('$dir/'.length)
        }
    }
    if (!requestedFileUris.includes(uri)) {
        requestedFileUris.push(uri)
    }
    if (uri.startsWith('zenodo://')) {
        const p = uri.slice("zenodo://".length)
        const aa = p.split('/')
        const recordId = aa[0]
        const fileName = aa.slice(1).join('/')
        uri = `https://zenodo.org/api/records/${recordId}/files/${fileName}/content`
    }
    if (uri.startsWith('sha1://') || uri.startsWith('http://') || uri.startsWith('https://')) {
        const aa = await _getFileUrlFromUri(uri, o)
        if (!aa) return undefined
        const {url, size, foundLocally, sha1} = aa
        const headers: HeadersInit = {}
        if ((startByte !== undefined) && (endByte !== undefined)) {
            headers['Range'] = `bytes=${startByte}-${endByte - 1}` // apparently if "=" is not used, cloudflare struggles (gives CORS error)
        }
        const rr = await fetch(
            url,
            {
                method: 'GET',
                headers
            }
        )
        if ((rr.status !== 200) && (rr.status !== 206)) { // 206 status is for range header
            throw Error(`Error getting file (${rr.status}) (${await rr.text()}): ${url}`)
        }
        if (!rr.body) {
            throw Error(`No body in get response: ${url}`)
        }
        const reader = rr.body.getReader()
        const chunks: ArrayBuffer[] = []
        let bytesLoaded = 0
        let timer = Date.now()
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const {done, value} = await reader.read()
            if (done) break
            bytesLoaded += value.byteLength
            if (size) {
                const elapsed = Date.now() - timer
                if (elapsed > 1000) {
                    onProgress({loaded: bytesLoaded, total: size})
                    timer = Date.now()
                }
            }
            chunks.push(value.buffer)
        }
        const arrayBuffer = concatenateArrayBuffers(chunks)
        const doStoreLocally = ((localKacheryServerIsEnabled()) && (!foundLocally) && (await localKacheryServerIsAvailable({retry: false})))
        if ((doStoreLocally) && (sha1)) {
            // note: I tried doing this via streaming, but had a terrible time getting it to work by posting chunks. Tried both axios and fetch.
            console.info(`STORING CONTENT LOCALLY: sha1/${sha1}`)
            await fetch(`${localKacheryServerBaseUrl}/upload/sha1/${sha1}`, {
                body: arrayBuffer,
                method: 'POST'
            })
        }
        return {arrayBuffer, size, foundLocally}
    }
    else if (uri.startsWith('gh://')) {
        try {
            const {content: arrayBuffer} = await loadGitHubFileDataFromUri(uri)
            return {arrayBuffer, size: arrayBuffer.byteLength, foundLocally: false}
        }
        catch(err) {
            return undefined
        }
    }
    else if (uri.startsWith('rtcshare://')) {
        if (!o.rtcshareFileSystemClient) {
            throw Error('No rtcshare client')
        }
        const ppath = uri.slice('rtcshare://'.length)
        const arrayBuffer = await o.rtcshareFileSystemClient.readFile(ppath, startByte, endByte, {forceReload: true})
        return {arrayBuffer, size: undefined, foundLocally: false}
    }
    else {
        throw Error(`Unexpected data URI: ${uri}`)
    }

}

const concatenateArrayBuffers = (buffers: ArrayBuffer[]) => {
    if (buffers.length === 0) return new ArrayBuffer(0)
    if (buffers.length === 1) return buffers[0]
    const totalSize = buffers.reduce((prev, buffer) => (prev + buffer.byteLength), 0)
    const ret = new Uint8Array(totalSize)
    let pos = 0
    for (const buf of buffers) {
        ret.set(new Uint8Array(buf), pos)
        pos += buf.byteLength
    }
    return ret.buffer
}

type FindFileType = 'findFile'

export const getFileDownloadUrl = async (hashAlg: string, hash: string, kacheryGatewayUrl: string, githubAuth: {userId?: string, accessToken?: string} | undefined, zone: string | undefined): Promise<{url: string, size?: number, foundLocally: boolean} | undefined> => {
    if ((localKacheryServerIsEnabled()) && (await localKacheryServerIsAvailable({retry: false}))) {
        const rrr = await getFileDownloadUrlForLocalKacheryServer(hashAlg, hash)
        if (rrr) {
            return {
                url: rrr.url,
                size: rrr.size,
                foundLocally: true
            }
        }
    }

    const {clientId, keyPair} = await getKacheryCloudClientInfo()
    const url = `${kacheryGatewayUrl}/api/gateway`
    // const url = 'http://localhost:3001/api/kacherycloud'
    const payload = {
        type: 'findFile' as FindFileType,
        timestamp: Date.now(),
        hashAlg: hashAlg as 'sha1',
        hash,
        zone: zone || 'default'
    }
    const signature = await signMessage(payload, keyPair)
    const req: FindFileRequest = {
        payload,
        fromClientId: !githubAuth?.userId ? clientId : undefined,
        signature: !githubAuth?.userId ? signature : undefined,
        githubUserId: githubAuth?.userId,
        githubAccessToken: githubAuth?.accessToken
    }
    const x = await axios.post(url, req)
    const resp = x.data
    if (!isFindFileResponse(resp)) {
        console.warn(resp)
        throw Error('Unexpected findFile response')
    }
    if ((resp.found) && (resp.url)) {
        return {
            url: resp.url,
            size: resp.size,
            foundLocally: false
        }
    }
    else {
        return undefined
    }
}

const getFileDownloadUrlForLocalKacheryServer = async (hashAlg: string, hash: string): Promise<{url: string, size: number} | undefined> => {
    if (!(await localKacheryServerIsAvailable({retry: false}))) {
        return undefined
    }
    if (hashAlg !== 'sha1') {
        return undefined
    }
    const url = `${localKacheryServerBaseUrl}/sha1/${hash}`
    let resp
    try {
        resp = await axios.head(url)
    }
    catch(err) {
        return undefined
    }
    if (resp.status === 200) {
        const size = parseInt(resp.headers['content-length'])
        console.info(`Found locally: ${hashAlg}/${hash}`)
        return {url, size}
    }
    else {
        return undefined
    }
}

function str2ab(str: string) {
    const enc = new TextEncoder()
    return enc.encode(str)
}

export default communicateWithFigureWindow