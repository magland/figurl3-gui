import validateObject, { isBoolean, isEqualTo, isJSONObject, isOneOf, isString, optional } from "../validateObject"

// getFigureData

export type GetFigureDataRequest = {
    type: 'getFigureData'
}

export const isGetFigureDataRequest = (x: any): x is GetFigureDataRequest => {
    return validateObject(x, {
        type: isEqualTo('getFigureData')
    })
}

export type GetFigureDataResponse = {
    type: 'getFigureData'
    figureData: any
}

export const isGetFigureDataResponse = (x: any): x is GetFigureDataResponse => {
    return validateObject(x, {
        type: isEqualTo('getFigureData'),
        figureData: () => (true)
    })
}

// getFileData

export type GetFileDataRequest = {
    type: 'getFileData'
    uri: string
    responseType?: 'text' | 'json' | 'json-deserialized' // 'text', 'json', 'json-deserialized': default is 'json-deserialized'
}

export const isGetFileDataRequest = (x: any): x is GetFileDataRequest => {
    return validateObject(x, {
        type: isEqualTo('getFileData'),
        uri: optional(isString),
        responseType: optional(isOneOf(['text', 'json', 'json-deserialized'].map(a => (isEqualTo(a)))))
    })
}

export type GetFileDataResponse = {
    type: 'getFileData'
    fileData?: any
    errorMessage?: string
}

export const isGetFileDataResponse = (x: any): x is GetFileDataResponse => {
    return validateObject(x, {
        type: isEqualTo('getFileData'),
        fileData: optional(() => (true)),
        errorMessage: optional(isString)
    })
}

// getFileDataUrl

export type GetFileDataUrlRequest = {
    type: 'getFileDataUrl'
    uri: string
}

export const isGetFileDataUrlRequest = (x: any): x is GetFileDataUrlRequest => {
    return validateObject(x, {
        type: isEqualTo('getFileDataUrl'),
        uri: optional(isString)
    })
}

export type GetFileDataUrlResponse = {
    type: 'getFileDataUrl'
    fileDataUrl?: string
    errorMessage?: string
}

export const isGetFileDataUrlResponse = (x: any): x is GetFileDataUrlResponse => {
    return validateObject(x, {
        type: isEqualTo('getFileDataUrl'),
        fileDataUrl: optional(isString),
        errorMessage: optional(isString)
    })
}

// storeFile

export type StoreFileRequest = {
    type: 'storeFile'
    fileData: string
    uri?: string
}

export const isStoreFileRequest = (x: any): x is StoreFileRequest => {
    return validateObject(x, {
        type: isEqualTo('storeFile'),
        fileData: isString,
        uri: optional(isString)
    })
}

export type StoreFileResponse = {
    type: 'storeFile'
    uri?: string
    error?: string
}

export const isStoreFileResponse = (x: any): x is StoreFileResponse => {
    return validateObject(x, {
        type: isEqualTo('storeFile'),
        uri: optional(isString),
        error: optional(isString)
    })
}

// storeGithubFile

export type StoreGithubFileRequest = {
    type: 'storeGithubFile'
    fileData: string
    uri: string
}

export const isStoreGithubFileRequest = (x: any): x is StoreGithubFileRequest => {
    return validateObject(x, {
        type: isEqualTo('storeGithubFile'),
        fileData: isString,
        uri: isString
    })
}

export type StoreGithubFileResponse = {
    type: 'storeGithubFile'
    success: boolean
    error?: string
}

export const isStoreGithubFileResponse = (x: any): x is StoreGithubFileResponse => {
    return validateObject(x, {
        type: isEqualTo('storeGithubFile'),
        success: isBoolean,
        error: optional(isString)
    })
}

// setUrlState

export type SetUrlStateRequest = {
    type: 'setUrlState'
    state: {[key: string]: any}
}

export const isSetUrlStateRequest = (x: any): x is SetUrlStateRequest => {
    return validateObject(x, {
        type: isEqualTo('setUrlState'),
        state: isJSONObject
    })
}

export type SetUrlStateResponse = {
    type: 'setUrlState'
}

export const isSetUrlStateResponse = (x: any): x is SetUrlStateResponse => {
    return validateObject(x, {
        type: isEqualTo('setUrlState')
    })
}

// serviceQuery

export type ServiceQueryRequest = {
    type: 'serviceQuery'
    serviceName: string
    query: any
}

export const isServiceQueryRequest = (x: any): x is ServiceQueryRequest => {
    return validateObject(x, {
        type: isEqualTo('serviceQuery'),
        serviceName: isString,
        query: () => (true)
    })
}

export type ServiceQueryResponse = {
    type: 'serviceQuery'
    result?: any
    errorMessage?: string
}

export const isServiceQueryResponse = (x: any): x is ServiceQueryResponse => {
    return validateObject(x, {
        type: isEqualTo('serviceQuery'),
        result: optional(() => (true)),
        errorMessage: optional(isString)
    })
}

//////////////////////////////////////////////////////////////

export type FigurlRequest =
    GetFigureDataRequest |
    GetFileDataRequest |
    GetFileDataUrlRequest |
    StoreFileRequest |
    StoreGithubFileRequest |
    SetUrlStateRequest |
    ServiceQueryRequest

export const isFigurlRequest = (x: any): x is FigurlRequest => {
    return isOneOf([
        isGetFigureDataRequest,
        isGetFileDataRequest,
        isGetFileDataUrlRequest,
        isStoreFileRequest,
        isStoreGithubFileRequest,
        isSetUrlStateRequest,
        isServiceQueryRequest
    ])(x)
}

export type FigurlResponse =
    GetFigureDataResponse |
    GetFileDataResponse |
    GetFileDataUrlResponse |
    StoreFileResponse |
    StoreGithubFileResponse |
    SetUrlStateResponse |
    ServiceQueryResponse

export const isFigurlResponse = (x: any): x is FigurlResponse => {
    return isOneOf([
        isGetFigureDataResponse,
        isGetFileDataResponse,
        isGetFileDataUrlResponse,
        isStoreFileResponse,
        isStoreGithubFileResponse,
        isSetUrlStateResponse,
        isServiceQueryResponse
    ])(x)
}