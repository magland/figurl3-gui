import { DeleteFigureRequest, DeleteFigureResponse, isFigure } from "./FigureRequest";
import firestoreDatabase from "./common/firestoreDatabase";
import { VerifiedReCaptchaInfo } from "./common/verifyReCaptcha";

const deleteFigureHandler = async (request: DeleteFigureRequest, verifiedUserId: string, verifiedReCaptchaInfo?: VerifiedReCaptchaInfo): Promise<DeleteFigureResponse> => {
    if (!verifiedReCaptchaInfo) {
        throw Error('Recaptcha info is not verified')
    }
    const db = firestoreDatabase()
    const collection = db.collection('figurl.savedFigures')
    const docRef = collection.doc(request.figureId)
    const doc = await docRef.get()
    if (!doc.exists) {
        throw Error(`Figure does not exist.`)
    }
    const docData = doc.data()
    if (!isFigure(docData)) {
        throw Error(`Invalid figure document`)
    }
    if (docData.ownerId !== verifiedUserId) {
        throw Error(`Incorrect figure owner: ${docData.ownerId} <> ${verifiedUserId}`)
    }
    await docRef.delete()

    return {
        type: 'deleteFigure'
    }
}

export default deleteFigureHandler