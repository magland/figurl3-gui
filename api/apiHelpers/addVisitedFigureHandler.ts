import {
    AddVisitedFigureRequest,
    AddVisitedFigureResponse,
    VisitedFigure,
    isVisitedFigure
} from "./VisitedFigureRequest";
import firestoreDatabase from "./common/firestoreDatabase";
import crypto from "crypto";

const parseFigurl = (url: string) => {
  const queryString = url.split("?")[1] || "";
  const query: { [key: string]: any } = {};
  const a = queryString.split("&");
  for (const b of a) {
    const c = b.split("=");
    if (c.length === 2) {
      query[c[0]] = c[1];
    }
  }
  return {
    viewUri: query.v || "",
    dataUri: query.d || "",
    state: query.s || "",
    zone: query.zone || "",
    label: query.label || "",
  };
};

const addVisitedFigureHandler = async (
  request: AddVisitedFigureRequest
): Promise<AddVisitedFigureResponse> => {
  const { figureUrl, code } = request;

  if (code !== process.env.VITE_ADD_VISITED_FIGURE_CODE) {
    throw Error("Invalid code");
  }

  if (!figureUrl.startsWith("https://figurl.org/f")) {
    throw Error("Invalid figure URL");
  }

  const fExisting = await findVisitedFigure(figureUrl);
  if (fExisting) {
    await updateVisitedFigure(figureUrl, {
      numVisits: fExisting.numVisits + 1,
      lastVisitedTimestamp: Date.now(),
    });
    return {
      type: "addVisitedFigure",
    };
  } else {
    const { viewUri, dataUri, state, zone, label } = parseFigurl(figureUrl);
    const newF: VisitedFigure = {
      figureUrl,
      lastVisitedTimestamp: Date.now(),
      numVisits: 1,
      viewUri,
      dataUri,
      state,
      zone,
      label,
    };
    await addVisitedFigure(newF);
    return {
      type: "addVisitedFigure",
    };
  }
};

const findVisitedFigure = async (figureUrl: string) => {
    const db = firestoreDatabase();
    const collection = db.collection("figurl.visitedFigures");
    const figureUrlSha1 = sha1(figureUrl);
    const docRef = collection.doc(figureUrlSha1);
    const doc = await docRef.get();
    if (doc.exists) {
        const dd = doc.data();
        if (!isVisitedFigure(dd)) {
            throw Error('Invalid VisitedFigure data');
        }
        return dd;
    } else {
        return undefined;
    }
}


const addVisitedFigure = async (visitedFigure: VisitedFigure) => {
  const db = firestoreDatabase();
  const collection = db.collection("figurl.visitedFigures");
  const figureUrlHash = sha1(visitedFigure.figureUrl);
  const docRef = collection.doc(figureUrlHash);
  await docRef.set(visitedFigure);
};

const updateVisitedFigure = async (
  figureUrl: string,
  update: Partial<VisitedFigure>
) => {
  const db = firestoreDatabase();
  const collection = db.collection("figurl.visitedFigures");
  const figureUrlHash = sha1(figureUrl);
  const docRef = collection.doc(figureUrlHash);
  await docRef.update(update);
};

export const sha1 = (str: string) => {
  const sha1 = crypto.createHash("sha1");
  sha1.update(str);
  return sha1.digest("hex");
}

export default addVisitedFigureHandler;
