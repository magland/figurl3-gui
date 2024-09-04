import { GetVisitedFiguresRequest, GetVisitedFiguresResponse, VisitedFigure, isVisitedFigure } from "./VisitedFigureRequest";
import firestoreDatabase from "./common/firestoreDatabase";

const getVisitedFiguresHandler = async (request: GetVisitedFiguresRequest): Promise<GetVisitedFiguresResponse> => {
    const {
        viewUri,
        dataUri,
        zone,
        figureUrl,
        passcode
    } = request
    const VITE_GET_VISITED_FIGURES_PASSCODE = process.env.VITE_GET_VISITED_FIGURES_PASSCODE
    if (passcode !== VITE_GET_VISITED_FIGURES_PASSCODE) {
        throw Error('Invalid passcode')
    }
    const db = firestoreDatabase()
    const collection = db.collection('figurl.visitedFigures')
    let query: FirebaseFirestore.Query = collection
    if (viewUri) {
        query = query.where('viewUri', '==', viewUri)
    }
    if (dataUri) {
        query = query.where('dataUri', '==', dataUri)
    }
    if (zone) {
        query = query.where('zone', '==', zone)
    }
    if (figureUrl) {
        query = query.where('figureUrl', '==', figureUrl)
    }
    query = query.orderBy('lastVisitedTimestamp', 'desc')
    query = query.limit(1000)
    const snapshot = await query.get()
    const visitedFigures: VisitedFigure[] = []
    snapshot.forEach(doc => {
        const dd = {
            ...doc.data()
        }
        if (!isVisitedFigure(dd)) {
            throw Error('Invalid VisitedFigure data')
        }
        visitedFigures.push(dd)
    })
    return {
        type: 'getVisitedFigures',
        visitedFigures
    }

}

export default getVisitedFiguresHandler
