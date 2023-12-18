//////////////////////////////////////////////////////////////////////////////////
// getZoneInfo

import { isSignature, Signature } from "./viewInterface/kacheryTypes"
import axios from "axios"
import validateObject, { isBoolean, isEqualTo, isNumber, isString, optional } from "../validateObject"
import { signMessage } from "./crypto/signatures"
import { getKacheryCloudClientInfo } from "./getKacheryCloudClientInfo"

export type GetZoneInfoRequest = {
    payload: {
        type: 'getZoneInfo'
        timestamp: number
        zoneName: string
    }
    fromClientId: string
    signature: Signature
}

export const isGetZoneInfoRequest = (x: any): x is GetZoneInfoRequest => {
    const isPayload = (y: any) => {
        return validateObject(y, {
            type: isEqualTo('getZoneInfo'),
            timestamp: isNumber,
            zoneName: isString
        })
    }
    return validateObject(x, {
        payload: isPayload,
        fromClientId: isString,
        signature: isSignature
    })
}

export type GetZoneInfoResponse = {
    type: 'getZoneInfo'
    found: boolean
    kacheryGatewayUrl?: string
}

export const isGetZoneInfoResponse = (x: any): x is GetZoneInfoResponse => {
    return validateObject(x, {
        type: isEqualTo('getZoneInfo'),
        found: isBoolean,
        kacheryGatewayUrl: optional(isString)
    })
}

type GetZoneInfoString = 'getZoneInfo'

const getZoneInfo = async (zone: string) => {
    const {clientId, keyPair} = await getKacheryCloudClientInfo()
    const url = `https://kachery-gateway.figurl.org/api/gateway`
    const payload = {
        type: 'getZoneInfo' as GetZoneInfoString,
        timestamp: Date.now(),
        zoneName: zone
    }
    const signature = await signMessage(payload, keyPair)
    const req: GetZoneInfoRequest = {
        payload,
        fromClientId: clientId,
        signature
    }
    const x = await axios.post(url, req)
    const resp = x.data
    if (!isGetZoneInfoResponse(resp)) {
        console.warn(resp)
        throw Error('Unexpected getZoneInfo response')
    }
    return resp
}

export default getZoneInfo