import { requestedFiles, requestedFileUris } from "../Figure3/communicateWithFigureWindow"

const getFileManifest = (): {uri: string, name?: string, size?: number}[] => {
    return requestedFileUris.map(uri => (
        {uri, name: requestedFiles[uri]?.name, size: requestedFiles[uri]?.size}
    ))
}

export default getFileManifest