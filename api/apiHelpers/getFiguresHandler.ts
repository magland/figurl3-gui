import { Figure, GetFiguresRequest, GetFiguresResponse, isFigure } from "./FigureRequest";
import firestoreDatabase from "./common/firestoreDatabase";

const getFiguresHandler = async (request: GetFiguresRequest, verifiedUserId: string): Promise<GetFiguresResponse> => {
    if (verifiedUserId !== request.ownerId) {
        throw Error('Not authorized to get these figures')
    }
    const db = firestoreDatabase()
    const collection = db.collection('figurl.savedFigures')
    const results = await collection.where('ownerId', '==', request.ownerId).get()
    const figures: Figure[] = []
    for (const doc of results.docs) {
        const x = doc.data()
        if (isFigure(x)) {
            figures.push(x)
        }
        else {
            console.warn(x)
            console.warn('Invalid figure in database (getFiguresHandler)')
            // await doc.ref.delete() // only delete if we are sure we want to (during development) -- don't risk losing data!
        }
    }
    return {
        type: 'getFigures',
        figures
    }
}

export default getFiguresHandler