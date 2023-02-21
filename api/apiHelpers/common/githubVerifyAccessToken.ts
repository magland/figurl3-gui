import axios from 'axios'

const githubVerifyAccessToken = async (userId: string, accessToken?: string) => {
  if (!accessToken) throw Error('No github access token *')
  const resp = await axios.get(`https://api.github.com/user`, {headers: {Authorization: `token ${accessToken}`}})
  if (resp.data.login === userId) {
    return resp.data.login as string
  }
  else {
    throw Error('Incorrect user ID for access token')
  }
}

export default githubVerifyAccessToken