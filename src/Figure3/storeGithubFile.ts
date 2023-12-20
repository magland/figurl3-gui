import { getGitHubTokenInfoFromLocalStorage } from "../GithubAuth/getGithubAuthFromLocalStorage"

// // Was having a lot of trouble importing from npm package
// // Was getting message "Failed to resolve entry for package "@octokit/plugin-retry". The package may have incorrect main/module/exports specified in its package.json."
// // This wasn't happening for CRA (only Vite)
// // So loaded it in index.html and stored in in window.Octokit
// // import { Octokit } from 'octokit'
// const Octokit = (window as any).Octokit

// The above problem seems to have been resolved via node v18
// AND using package octokit@3

import { Octokit } from 'octokit'

const storeGithubFile = async ({fileData, uri}: {fileData: ArrayBuffer, uri: string}) => {
    const {userName, repoName, branchName, fileName} = parseGitHubFileUri(uri)

    let existingFileData: ArrayBuffer | undefined
    let existingSha: string | undefined
    try {
        // note that this will include the cached newest version if relevant
        // which is important for when we pass in the existingSha below
        const aa = await loadGitHubFileDataFromUri(uri)
        existingFileData = aa.content
        existingSha = aa.sha
    }
    catch {
        existingFileData = undefined
        existingSha = undefined
    }

    if (existingFileData) {
        if (existingFileData === fileData) {
            // no need to update
            return
        }
    }

    const githubTokenInfo = getGitHubTokenInfoFromLocalStorage()
    const octokit = new Octokit({
        auth: githubTokenInfo?.token
    })

    const r = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner: userName,
        repo: repoName,
        path: fileName,
        message: `Set ${fileName}`,
        content: arrayBufferToBase64(fileData),
        branch: branchName,
        sha: existingSha
    })
    const newSha = (r.data as any).content.sha

    try {
        if (existingSha) { // only worry about this if we are replacing existing content
            let ilgcRecord = getILGCRecord(userName, repoName, branchName, fileName)
            ilgcRecord = {
                timestamp: Date.now(),
                newContentBase64: arrayBufferToBase64(fileData),
                newSha,
                oldShas: ilgcRecord ? [...(ilgcRecord.oldShas || []), existingSha] : [existingSha]
            }
            setILGCRecord(userName, repoName, branchName, fileName, ilgcRecord)
        }
    }
    catch(err) {
        console.warn(err)
        console.warn('Problem with ILGC')
    }
}

/*
This is important because there is a lag between when gh refs are changed
via the gh api and when those changes take effect for content requests.
A lot more could be said about this... but the upshot is:
When an individual user saves their work and reloads the page, they will see everything updated properly (even though gh hasn't sync'd yet), because things are loading from local cache.
But a user on a different browser will experience a delay before seeing the changes. (they will need to refresh the page)
Subsequent commits for the original user will work, even if gh has not yet synced.
However, if a second user tries to make a commit without reloading the updated page it will fail.
*/
type ILGCRecord = {
    // records an event where we set the content
    timestamp: number
    newSha: string
    newContentBase64: string
    oldShas: string[] // important to keep track of these
}
type ImportantLocalGitHubCache = {
    [key: string]: ILGCRecord
}
const getImportantLocalGitHubCache = (): ImportantLocalGitHubCache => {
    try {
        return JSON.parse(localStorage.getItem('important-local-github-cache-v1') || '{}')
    }
    catch(err) {
        return {}
    }
}
const setImportantLocalGitHubCache = (x: ImportantLocalGitHubCache) => {
    localStorage.setItem('important-local-github-cache-v1', JSON.stringify(x))
}
const formKey = (user: string, repo: string, branch: string, file: string) => {
    return `${user}/${repo}/${branch}/${file}`
}
const getILGCRecord = (user: string, repo: string, branch: string, file: string): ILGCRecord | undefined => {
    const cc = getImportantLocalGitHubCache()
    return cc[formKey(user, repo, branch, file)]
}
const setILGCRecord = (user: string, repo: string, branch: string, file: string, record: ILGCRecord) => {
    const cc = getImportantLocalGitHubCache()
    cc[formKey(user, repo, branch, file)] = record
    setImportantLocalGitHubCache(cc)
}
const deleteIlgcRecord = (user: string, repo: string, branch: string, file: string) => {
    const cc = getImportantLocalGitHubCache()
    delete cc[formKey(user, repo, branch, file)]
    setImportantLocalGitHubCache(cc)
}
const cleanupILGC = () => {
    const cc = getImportantLocalGitHubCache()
    const keys = Object.keys(cc)
    for (const k of keys) {
        const elapsed = Date.now() - cc[k].timestamp
        if (elapsed >= 1000 * 60 * 10) {
            delete cc[k]
        }
    }
    setImportantLocalGitHubCache(cc)
}
cleanupILGC() // do it once on start
/////////////////////////////////////////////////////////////////////////////////

export const loadGitHubFileDataFromUri = async (uri: string): Promise<{content: ArrayBuffer, sha: string}> => {
    console.info(`GitHub: ${uri.slice('gh://'.length)}`)

    const {userName, repoName, branchName, fileName} = parseGitHubFileUri(uri)

    const githubInfoToken = getGitHubTokenInfoFromLocalStorage()
    const octokit = new Octokit({
        auth: githubInfoToken?.token
    })
    
    const rr = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: userName,
        repo: repoName,
        path: fileName,
        ref: branchName
    })
    if (rr.status !== 200) {
        throw Error(`Problem loading file ${uri}: (${rr.status})`)
    }
    const content1: string = (rr.data as any).content
    // const buf = Buffer.from(content1, 'base64')
    const buf = base64ToArrayBuffer(content1)
    // const content = buf.toString('utf-8')
    const content = buf
    const sha = (rr.data as any).sha

    try {
        const ilgcRecord = getILGCRecord(userName, repoName, branchName, fileName)
        if (ilgcRecord) {
            if (ilgcRecord.newSha === sha) {
                // we are good - we have the new content
                deleteIlgcRecord(userName, repoName, branchName, fileName)
            }
            else if ((ilgcRecord.oldShas || []).includes(sha)) {
                // We most likely have old content (rather than content coming externally). So, let's return the new content.
                console.info('WARNING: returning locally cached github content', ilgcRecord.newSha)
                return {
                    content: base64ToArrayBuffer(ilgcRecord.newContentBase64),
                    sha: ilgcRecord.newSha
                }
            }
        }
    }
    catch(err) {
        console.warn(err)
        console.warn('Problem with ILGC')
    }

    return {content, sha}
}

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary_string = window.atob(base64)
    const bytes = new Uint8Array(binary_string.length)
    for (let i = 0; i < binary_string.length; i++) {
        bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes
}

export const arrayBufferToBase64 = (data: ArrayBuffer): string => {
    return window.btoa((new TextDecoder()).decode(data))
}

export const parseGitHubFileUri = (uri: string) => {
    const a = uri.split('?')[0].split('/')
    if (a.length < 6) {
        throw Error(`Invalid github file uri: ${uri}`)
    }
    return {
        userName: a[2],
        repoName: a[3],
        branchName: a[4],
        fileName: a.slice(5).join('/')
    }
}

export default storeGithubFile