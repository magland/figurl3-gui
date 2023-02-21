import WebrtcConnectionToService from "./WebrtcConnectionToService"

const urlSearchParams = new URLSearchParams(window.location.search)
const queryParams = Object.fromEntries(urlSearchParams.entries())

export const serviceBaseUrl = queryParams.sh ? (
    queryParams.sh
) : (
    undefined
)

export const webrtcConnectionToService = serviceBaseUrl ? new WebrtcConnectionToService() : undefined