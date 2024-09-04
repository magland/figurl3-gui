import { isArrayOf, isEqualTo, isNumber, isOneOf, isString, optional, default as validateObject } from "./validateObject"

export type VisitedFigure = {
    figureUrl: string
    lastVisitedTimestamp: number
    numVisits: number
    viewUri: string
    dataUri: string
    state: string
    label: string
    zone: string
}

export const isVisitedFigure = (y: any): y is VisitedFigure => {
    return validateObject(y, {
        figureUrl: isString,
        lastVisitedTimestamp: isNumber,
        numVisits: isNumber,
        viewUri: isString,
        dataUri: isString,
        state: isString,
        label: isString,
        zone: isString
    })
}

// AddVisitedFigure

export type AddVisitedFigureRequest = {
    type: 'addVisitedFigure'
    figureUrl: string
    code: string
}

export const isAddVisitedFigureRequest = (x: any): x is AddVisitedFigureRequest => {
    return validateObject(x, {
        type: isEqualTo('addVisitedFigure'),
        figureUrl: isString,
        code: isString
    })
}

export type AddVisitedFigureResponse = {
    type: 'addVisitedFigure'
}

export const isAddVisitedFigureResponse = (x: any): x is AddVisitedFigureResponse => {
    return validateObject(x, {
        type: isEqualTo('addVisitedFigure')
    })
}

// GetVisitedFigures

export type GetVisitedFiguresRequest = {
    type: 'getVisitedFigures'
    viewUri?: string
    dataUri?: string
    zone?: string
    figureUrl?: string
    passcode: string
}

export const isGetVisitedFiguresRequest = (x: any): x is GetVisitedFiguresRequest => {
    return validateObject(x, {
        type: isEqualTo('getVisitedFigures'),
        viewUri: optional(isString),
        dataUri: optional(isString),
        zone: optional(isString),
        figureUrl: optional(isString),
        passcode: isString
    })
}

export type GetVisitedFiguresResponse = {
    type: 'getVisitedFigures',
    visitedFigures: VisitedFigure[]
}

export const isGetVisitedFiguresResponse = (x: any): x is GetVisitedFiguresResponse => {
    return validateObject(x, {
        type: isEqualTo('getVisitedFigures'),
        visitedFigures: isArrayOf(isVisitedFigure)
    })
}

/////////////////////////////////////////////////////////////////////////////

export type VisitedFigureRequest =
    AddVisitedFigureRequest |
    GetVisitedFiguresRequest

export const isVisitedFigureRequest = (x: any): x is VisitedFigureRequest => {
    return isOneOf([
        isAddVisitedFigureRequest,
        isGetVisitedFiguresRequest
    ])(x)
}

export type VisitedFigureResponse =
    AddVisitedFigureResponse |
    GetVisitedFiguresResponse

export const isVisitedFigureResponse = (x: any): x is VisitedFigureResponse => {
    return isOneOf([
        isAddVisitedFigureResponse,
        isGetVisitedFiguresResponse
    ])(x)
}