import { VercelRequest, VercelResponse } from '@vercel/node'
import addFigureHandler from './apiHelpers/addFigureHandler'
import githubVerifyAccessToken from './apiHelpers/common/githubVerifyAccessToken'
import verifyReCaptcha, { VerifiedReCaptchaInfo } from './apiHelpers/common/verifyReCaptcha'
import deleteFigureHandler from './apiHelpers/deleteFigureHandler'
import getFiguresHandler from './apiHelpers/getFiguresHandler'
import { Auth, isFigureRequest } from './apiHelpers/FigureRequest'

const verifyAuth = async (auth: Auth) => {
    const {userId, githubAccessToken, reCaptchaToken} = auth
    // if ((userId) && (!googleIdToken)) throw Error('No google id token')
    // const verifiedUserId = userId ? await googleVerifyIdToken(userId, googleIdToken) : ''
    if ((userId) && (!githubAccessToken)) throw Error('No github access token')
    const verifiedUserId = userId ? await githubVerifyAccessToken(userId, githubAccessToken) : ''
    const verifiedReCaptchaInfo: VerifiedReCaptchaInfo | undefined = await verifyReCaptcha(reCaptchaToken)
    return {verifiedUserId, verifiedReCaptchaInfo}
}

module.exports = (req: VercelRequest, res: VercelResponse) => {
    const {body: requestBody} = req
    if (!isFigureRequest(requestBody)) {
        console.warn('Invalid request body', requestBody)
        res.status(400).send(`Invalid request body: ${JSON.stringify(requestBody)}`)
        return
    }
    ;(async () => {
        if (requestBody.type === 'addFigure') {
            const {verifiedUserId, verifiedReCaptchaInfo} = await verifyAuth(requestBody.auth)
            return await addFigureHandler(requestBody, verifiedUserId, verifiedReCaptchaInfo)
        }
        else if (requestBody.type === 'deleteFigure') {
            const {verifiedUserId, verifiedReCaptchaInfo} = await verifyAuth(requestBody.auth)
            return await deleteFigureHandler(requestBody, verifiedUserId, verifiedReCaptchaInfo)
        }
        else if (requestBody.type === 'getFigures') {
            const {verifiedUserId} = await verifyAuth(requestBody.auth)
            return await getFiguresHandler(requestBody, verifiedUserId)
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
