import { FigurlRequest, FigurlResponse, isFigurlRequest, StoreGithubFileResponse as StoreGithubFileResponseFigurl } from "@figurl/interface/dist/viewInterface/FigurlRequestTypes"
import { UserId } from "@figurl/interface/dist/viewInterface/kacheryTypes"
import { FileDownloadProgressMessage, SetCurrentUserMessage } from "@figurl/interface/dist/viewInterface/MessageToChildTypes"
import axios from "axios"
import QueryString from 'querystring'
import { getGitHubTokenInfoFromLocalStorage } from "../GithubAuth/getGithubAuthFromLocalStorage"
import { localKacheryServerBaseUrl, localKacheryServerIsAvailable, localKacheryServerIsEnabled } from "../MainWindow/LocalKacheryDialog"
import { signMessage } from "./crypto/signatures"
import deserializeReturnValue from "./deserializeReturnValue"
import { StoreFileRequest, StoreFileResponse, StoreGithubFileRequest, StoreGithubFileResponse } from "./FigurlRequestTypes"
import { FindFileRequest, isFindFileResponse } from "./GatewayRequest"
import { getKacheryCloudClientInfo } from "./getKacheryCloudClientInfo"
import kacheryCloudStoreFile from "./kacheryCloudStoreFile"
import storeGithubFile, { loadGitHubFileDataFromUri, parseGitHubFileUri } from "./storeGithubFile"

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
        figureDataUri: string,
        kacheryGatewayUrl: string,
        githubAuth?: {userId?: string, accessToken?: string},
        zone?: string,
        onSetUrlState: (state: {[k: string]: any}) => void,
        verifyPermissions: (purpose: 'store-file' | 'store-github-file', params: any) => Promise<boolean>
    }
) => {
    const {figureId, figureDataUri, kacheryGatewayUrl, githubAuth, zone, verifyPermissions} = o
    const contentWindow = e.contentWindow
    if (!contentWindow) {
        console.warn('No contentWindow on iframe element')
        return
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
                console.warn('Invalid figurl request from window')
            }
        })()
    })
    const _handleFigurlRequest = async (req: FigurlRequest): Promise<FigurlResponse | undefined> => {
        const handleStoreFileRequest = async (req: StoreFileRequest): Promise<StoreFileResponse> => {
            if (!(await verifyPermissions('store-file', {}))) {
                return {
                    type: 'storeFile',
                    uri: undefined
                }
            }
            
            const {fileData} = req
            const uri = await kacheryCloudStoreFile(fileData, kacheryGatewayUrl, githubAuth, zone || 'default')
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

        if (req.type === 'getFigureData') {
            const a = await _loadFileFromUri(figureDataUri, undefined, undefined, () => {}, {kacheryGatewayUrl, githubAuth, zone, name: 'root'})
            if (!a) return
            const dec = new TextDecoder()
            const figureData = await deserializeReturnValue(JSON.parse(dec.decode(a.arrayBuffer)))
            return {
                type: 'getFigureData',
                figureData
            }
        }
        else if (req.type === 'getFileData') {
            const onProgress = (a: {loaded: number, total: number}) => {
                const mm: FileDownloadProgressMessage = {
                    type: 'fileDownloadProgress',
                    uri: req.uri,
                    loaded: a.loaded,
                    total: a.total
                }
                contentWindow.postMessage(mm, '*')
            }
            const a = await _loadFileFromUri(req.uri, req.startByte, req.endByte, onProgress, {kacheryGatewayUrl, githubAuth, zone})
            if (!a) return
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
                fileData = a
            }
            else { // text
                fileData = dec.decode(a.arrayBuffer)
            }
            return {
                type: 'getFileData',
                fileData
            }
        }
        else if (req.type === 'getFileDataUrl') {
            const aa = await _getFileUrlFromUri(req.uri, {kacheryGatewayUrl, githubAuth, zone})
            if (!aa) return {
                type: 'getFileDataUrl',
                errorMessage: `Unable to get file URL from URI: ${req.uri}`
            }
            return {
                type: 'getFileDataUrl',
                fileDataUrl: aa.url
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
    }
    const msg: SetCurrentUserMessage = {
        type: 'setCurrentUser',
        userId: githubAuth && githubAuth.userId ? githubAuth.userId as any as UserId : undefined
    }
    contentWindow.postMessage(msg, '*')
    return () => {
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
    else return undefined
}

const _loadFileFromUri = async (uri: string, startByte: number | undefined, endByte: number | undefined, onProgress: (a: {loaded: number, total: number}) => void, o: {kacheryGatewayUrl: string, githubAuth?: {userId?: string, accessToken?: string}, zone?: string, name?: string}): Promise<{arrayBuffer: ArrayBuffer, size?: number, foundLocally: boolean} | undefined> => {
    requestedFileUris.push(uri)
    if (uri.startsWith('sha1://')) {
        const aa = await _getFileUrlFromUri(uri, o)
        if (!aa) return undefined
        const {url, size, foundLocally, sha1} = aa
        const headers: HeadersInit = {}
        if ((startByte !== undefined) && (endByte !== undefined)) {
            headers['range'] = `bytes ${startByte}-${endByte - 1}`
        }
        const rr = await fetch(
            url,
            {
                method: 'GET',
                headers
            }
        )
        if (rr.status !== 200) {
            throw Error(`Error getting file (${await rr.text()}): ${url}`)
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
        if (doStoreLocally) {
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
        const {content: arrayBuffer} = await loadGitHubFileDataFromUri(uri)
        return {arrayBuffer, size: arrayBuffer.byteLength, foundLocally: false}
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