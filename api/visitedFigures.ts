import { VercelRequest, VercelResponse } from '@vercel/node'
import addVisitedFigureHandler from './apiHelpers/addVisitedFigureHandler'
import getVisitedFiguresHandler from './apiHelpers/getVisitedFiguresHandler'
import { isVisitedFigureRequest } from './apiHelpers/VisitedFigureRequest'

module.exports = (req: VercelRequest, res: VercelResponse) => {
    const {body: requestBody} = req
    if (!isVisitedFigureRequest(requestBody)) {
        console.warn('Invalid request body', requestBody)
        res.status(400).send(`Invalid request body: ${JSON.stringify(requestBody)}`)
        return
    }
    ;(async () => {
        if (requestBody.type === 'addVisitedFigure') {
            return await addVisitedFigureHandler(requestBody)
        }
        else if (requestBody.type === 'getVisitedFigures') {
            return await getVisitedFiguresHandler(requestBody)
        }
        else {
            throw Error(`Unexpected figure request: ${requestBody.type}`)
        }
    })().then((result) => {
        res.json(result)
    }).catch((error: Error) => {
        console.warn(error.message)
        res.status(404).send(`Error: ${error.message}`)
    })
}
