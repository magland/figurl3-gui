import { FigurlRequest, isFigurlRequest } from "@figurl/interface/dist/viewInterface/FigurlRequestTypes"
import { FileDownloadProgressMessage } from "@figurl/interface/dist/viewInterface/MessageToChildTypes"
import axios from "axios"
import { localKacheryServerBaseUrl, localKacheryServerIsAvailable, localKacheryServerIsEnabled } from "../MainWindow/LocalKacheryDialog"
import { signMessage } from "./crypto/signatures"
import deserializeReturnValue from "./deserializeReturnValue"
import { FindFileRequest, isFindFileResponse } from "./GatewayRequest"
import { getKacheryCloudClientInfo } from "./getKacheryCloudClientInfo"

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

const communicateWithFigureWindow = (e: HTMLIFrameElement, o: {figureId: string, figureDataUri: string, kacheryGatewayUrl: string, githubAuth?: {userId?: string, accessToken?: string}, zone?: string}) => {
    const {figureId, figureDataUri, kacheryGatewayUrl, githubAuth, zone} = o
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
    const _handleFigurlRequest = async (req: FigurlRequest) => {
        if (req.type === 'getFigureData') {
            const a = await _loadFileBinary(figureDataUri, undefined, undefined, () => {}, {kacheryGatewayUrl, githubAuth, zone})
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
            const a = await _loadFileBinary(req.uri, req.startByte, req.endByte, onProgress, {kacheryGatewayUrl, githubAuth, zone})
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
    }
    return () => {
        delete messageListeners[figureId]
    }
}

const _loadFileBinary = async (d: string, startByte: number | undefined, endByte: number | undefined, onProgress: (a: {loaded: number, total: number}) => void, o: {kacheryGatewayUrl: string, githubAuth?: {userId?: string, accessToken?: string}, zone?: string}): Promise<{arrayBuffer: ArrayBuffer, size?: number, foundLocally: boolean} | undefined> => {
    const {kacheryGatewayUrl, githubAuth, zone} = o
    if (d.startsWith('sha1://')) {
        const a = d.split('?')[0].split('/')
        const sha1 = a[2]
        const aa = await getFileDownloadUrl('sha1', sha1, kacheryGatewayUrl, githubAuth, zone)
        if (!aa) return undefined
        const {url, size, foundLocally} = aa
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
    else {
        throw Error(`Unexpected data URI: ${d}`)
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

export default communicateWithFigureWindow