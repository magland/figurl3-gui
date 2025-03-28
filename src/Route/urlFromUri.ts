import axios from "axios"

const urlFromUri = async (uri: string) => {
    if (uri.startsWith('gs://')) {
        const p = uri.slice("gs://".length)
        return `https://storage.googleapis.com/${p}`
    }
    else if (uri.startsWith('npm://')) {
        // See: https://stackoverflow.com/questions/60041553/why-unpkg-is-free-to-use-and-what-will-happen-if-i-overuse
        const p = uri.slice("npm://".length)

        if (p === "@fi-sci/figurl-sortingview@12.0.15/dist/index.html") {
            // unpkg seems to have stopped working for the this one
            return "https://tempory.net/@fi-sci/figurl-sortingview-12.0.15/dist/index.html"
        }

        return `https://unpkg.com/${p}`
    }
    else if (uri.startsWith('http://') || uri.startsWith('https://')) {
        return uri
    }
    // else if (isValidAppName(uri)) {
    //     const resp = await axios.get(`/api/app/${uri}/url`, {responseType: 'json'})
    //     if (resp.status === 200) {
    //         if (!resp.data.success) {
    //             console.warn(`Failed to get url for app ${uri}: ${resp.data.error}`)
    //             return undefined
    //         }
    //         return resp.data.url
    //     }
    //     else {
    //         console.warn(`Problem getting url for app ${uri}`)
    //         return undefined
    //     }

    // }
    else {
        console.warn(`Invalid uri: ${uri}`)
        return undefined
    }
}

const isValidAppName = (name: string) => {
    if (name.includes('/')) {
        // for safety
        return false
    }
    if (name.startsWith('.')) {
        // for safety
        return false
    }
}

export default urlFromUri