import { serviceBaseUrl, webrtcConnectionToService } from "./config"
import parseMessageWithBinaryPayload from "./parseMessageWithBinaryPayload"
import { isRtcshareResponse, RtcshareRequest, RtcshareResponse } from "./RtcshareRequest"

const postApiRequest = async (request: RtcshareRequest): Promise<{response: RtcshareResponse, binaryPayload: ArrayBuffer | undefined}> => {
    if ((webrtcConnectionToService) && (webrtcConnectionToService.status === 'connected')) {
        if ((request.type !== 'probeRequest') && (request.type !== 'webrtcSignalingRequest')) {
            return webrtcConnectionToService.postApiRequest(request)
        }
    }
    const rr = await fetch(
        `${serviceBaseUrl}/api`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        }
    )
    if (rr.status !== 200) {
        throw Error(`Error posting API request: ${await rr.text()}`)
    }
    const buf = await rr.arrayBuffer()
    const {message: response, binaryPayload} = parseMessageWithBinaryPayload(buf)
    if (!isRtcshareResponse) {
        console.warn(response)
        throw Error('Unexpected api response')
    }
    return {response, binaryPayload}
}

export default postApiRequest