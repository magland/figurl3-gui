import { AddFigureRequest, AddFigureResponse, Figure } from "./FigureRequest";
import firestoreDatabase from "./common/firestoreDatabase";
import { VerifiedReCaptchaInfo } from "./common/verifyReCaptcha";

const addFigureHandler = async (request: AddFigureRequest, verifiedUserId: string, verifiedReCaptchaInfo?: VerifiedReCaptchaInfo): Promise<AddFigureResponse> => {
    if (!verifiedReCaptchaInfo) {
        throw Error('Recaptcha info is not verified')
    }
    const {viewUri, dataUri, urlState, label, zone, sh, dir, fileManifest, notes, ownerId} = request
    if (ownerId !== verifiedUserId) {
        throw Error('Not authorized to add figure. Incorrect owner ID.')
    }
    const figureId = randomAlphaString(12)
    const figure: Figure = {
        figureId,
        timestampCreated: Date.now(),
        ownerId,
        viewUri,
        dataUri,
        urlState,
        label,
        zone,
        sh,
        dir,
        fileManifest,
        notes
    }

    const db = firestoreDatabase()
    const collection = db.collection('figurl.savedFigures')
    const docRef = collection.doc(figure.figureId)
    await docRef.set(figure)

    return {
        type: 'addFigure',
        figureId
    }
}

export const randomAlphaString = (num_chars: number) => {
    if (!num_chars) {
        /* istanbul ignore next */
        throw Error('randomAlphaString: num_chars needs to be a positive integer.')
    }
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < num_chars; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

export default addFigureHandler