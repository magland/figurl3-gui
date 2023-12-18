import validateObject, { isNumber, isString, optional } from "../validateObject"

export type Client = {
    clientId: string
    ownerId: string
    timestampCreated: number
    label: string
    defaultProjectId?: string
}

export const isClient = (x: any): x is Client => {
    return validateObject(x, {
        clientId: isString,
        ownerId: isString,
        timestampCreated: isNumber,
        label: isString,
        defaultProjectId: optional(isString)
    })
}