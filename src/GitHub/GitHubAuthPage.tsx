import axios from "axios";
import { FunctionComponent, useEffect, useState } from "react";
import { setGitHubTokenInfoToLocalStorage } from "../GithubAuth/getGithubAuthFromLocalStorage";

type Props ={
}

const GitHubAuthPage: FunctionComponent<Props> = () => {
	const [status, setStatus] = useState<'checking' | 'okay' | 'error'>('checking')
	const [error, setError] = useState<string>('')
	const code = getQueryVariable('code')
	useEffect(() => {
		;(async () => {
			const resp = await axios.get(`/api/githubAuth?code=${code}`, {responseType: 'json'})
			const r = resp.data
			if ((!r.access_token) || (r.error)) {
				setStatus('error')
				setError(r.error)
				return
			}
			setGitHubTokenInfoToLocalStorage({
				token: r.access_token,
				isPersonalAccessToken: false
			})
			setStatus('okay')
		})()
	}, [code])
	return (
		<div style={{padding: 30}}>
			{
				status === 'checking' ? (
					<div>Checking authorization</div>
				) : status === 'okay' ? (
					<div>Logged in. You may now close this tab.</div>
				) : status === 'error' ? (
					<div style={{color: 'red'}}>Error: {error}</div>
				) : (
					<div>Unexpected status: {status}</div>
				)
			}
		</div>
	)
}

function getQueryVariable(variable: string) {
	var query = window.location.search.substring(1)
	var vars = query.split('&')
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split('=')
		if (decodeURIComponent(pair[0]) === variable) {
			return decodeURIComponent(pair[1])
		}
	}
}

export default GitHubAuthPage
