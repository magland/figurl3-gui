import { isNodeId, isUserId, NodeId, UserId } from "@figurl/interface/dist/viewInterface/kacheryTypes"
import validateObject, { isNumber, isString, optional } from "../validateObject"

export type Client = {
    clientId: NodeId
    ownerId: UserId
    timestampCreated: number
    label: string
    defaultProjectId?: string
}

export const isClient = (x: any): x is Client => {
    return validateObject(x, {
        clientId: isNodeId,
        ownerId: isUserId,
        timestampCreated: isNumber,
        label: isString,
        defaultProjectId: optional(isString)
    })
}