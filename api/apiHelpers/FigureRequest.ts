import { isArrayOf, isEqualTo, isNumber, isOneOf, isString, optional, default as validateObject } from "./validateObject"

export type Auth = {
    userId?: string,
    googleIdToken?: string
    githubAccessToken?: string
    reCaptchaToken?: string
}

export const isAuth = (x: any): x is Auth => {
    return validateObject(x, {
        userId: optional(isString),
        googleIdToken: optional(isString),
        githubAccessToken: optional(isString),
        reCaptchaToken: optional(isString)
    })
}

export type Figure = {
    figureId: string
    timestampCreated: number
    ownerId: string
    viewUri: string
    dataUri: string
    urlState?: any
    label: string
    zone?: string
    sh?: string
    dir?: string
    fileManifest: {uri: string, name?: string, size?: number}[]
    notes: string
}

export const isFigure = (y: any): y is Figure => {
    return validateObject(y, {
        figureId: isString,
        timestampCreated: isNumber,
        ownerId: isString,
        viewUri: isString,
        dataUri: isString,
        urlState: optional(() => (true)),
        label: isString,
        zone: optional(isString),
        sh: optional(isString),
        dir: optional(isString),
        fileManifest: isArrayOf(y => validateObject(y, {
            uri: isString,
            name: optional(isString),
            size: optional(isNumber)
        })),
        notes: isString
    })
}

// AddFigure

export type AddFigureRequest = {
    type: 'addFigure'
    ownerId: string
    viewUri: string
    dataUri: string
    urlState?: any
    label: string
    zone?: string
    sh?: string
    dir?: string
    fileManifest: {uri: string, name?: string, size?: number}[]
    notes: string
    auth: Auth
}

export const isAddFigureRequest = (x: any): x is AddFigureRequest => {
    return validateObject(x, {
        type: isEqualTo('addFigure'),
        ownerId: isString,
        viewUri: isString,
        dataUri: isString,
        urlState: optional(() => (true)),
        label: isString,
        zone: optional(isString),
        sh: optional(isString),
        dir: optional(isString),
        fileManifest: isArrayOf(y => validateObject(y, {
            uri: isString,
            name: optional(isString),
            size: optional(isNumber)
        })),
        notes: isString,
        auth: isAuth
    })
}

export type AddFigureResponse = {
    type: 'addFigure'
    figureId: string
}

export const isAddFigureResponse = (x: any): x is AddFigureResponse => {
    return validateObject(x, {
        type: isEqualTo('addFigure'),
        figureId: isString
    })
}

// DeleteFigure

export type DeleteFigureRequest = {
    type: 'deleteFigure'
    figureId: string,
    auth: Auth
}

export const isDeleteFigureRequest = (x: any): x is DeleteFigureRequest => {
    return validateObject(x, {
        type: isEqualTo('deleteFigure'),
        figureId: isString,
        auth: isAuth
    })
}

export type DeleteFigureResponse = {
    type: 'deleteFigure'
}

export const isDeleteFigureResponse = (x: any): x is DeleteFigureResponse => {
    return validateObject(x, {
        type: isEqualTo('deleteFigure')
    })
}

// GetFigures

export type GetFiguresRequest = {
    type: 'getFigures'
    ownerId: string
    auth: Auth
}

export const isGetFiguresRequest = (x: any): x is GetFiguresRequest => {
    return validateObject(x, {
        type: isEqualTo('getFigures'),
        ownerId: isString,
        auth: isAuth
    })
}

export type GetFiguresResponse = {
    type: 'getFigures',
    figures: Figure[]
}

export const isGetFiguresResponse = (x: any): x is GetFiguresResponse => {
    return validateObject(x, {
        type: isEqualTo('getFigures'),
        figures: isArrayOf(isFigure)
    })
}

/////////////////////////////////////////////////////////////////////////////

export type FigureRequest =
    AddFigureRequest |
    DeleteFigureRequest |
    GetFiguresRequest

export const isFigureRequest = (x: any): x is FigureRequest => {
    return isOneOf([
        isAddFigureRequest,
        isDeleteFigureRequest,
        isGetFiguresRequest
    ])(x)
}

export type FigureResponse =
    AddFigureResponse |
    DeleteFigureResponse |
    GetFiguresResponse

export const isFigureResponse = (x: any): x is FigureResponse => {
    return isOneOf([
        isAddFigureResponse,
        isDeleteFigureResponse,
        isGetFiguresResponse
    ])(x)
}