import { JSONStringifyDeterministic } from "@figurl/interface/dist/viewInterface/kacheryTypes";
import { Button } from "@mui/material";
import { FunctionComponent, MutableRefObject, useEffect, useMemo } from "react";
import GitHubLoginWindow from "../GitHub/GitHubLoginWindow";
import { useGithubAuth } from "../GithubAuth/useGithubAuth";
import sleepMsec from "./sleepMsec";

type Props = {
    onClose: () => void
    params: any
    authorizedPermissionsRef: MutableRefObject<{[k: string]: boolean | undefined}>
}

const GitHubPermissionsWindow: FunctionComponent<Props> = ({onClose, params, authorizedPermissionsRef}) => {
    const {signedIn} = useGithubAuth()
    const purpose = 'store-github-file'
    const k = useMemo(() => (`${purpose}.${JSONStringifyDeterministic(params)}`), [params])
    useEffect(() => {
        authorizedPermissionsRef.current[k] = undefined
        let cancel = false
        ;(async () => {
            while (!cancel) {
                const p = authorizedPermissionsRef.current[k]
                if (p !== undefined) {
                    onClose()
                }
                await sleepMsec(100)
            }
        })()
        return () => {
            cancel = true
        }
    }, [onClose, k, authorizedPermissionsRef])

    return (
        <div>
            <h3>This application is requesting to create or update the following file on GitHub on your behalf.</h3>
            <h3>{params.uri}</h3>
            {
                signedIn ? (
                    <span>
                        <p>To allow this, click {`"Authorize"`} below.</p>
                        <div>
                            <Button style={{color: 'green'}} onClick={() => {authorizedPermissionsRef.current[k] = true}}>Authorize this application</Button>
                            <Button onClick={() => {authorizedPermissionsRef.current[k] = false}}>Cancel</Button>
                        </div>
                    </span>
                ) : (
                    <p style={{color: 'red'}}>GitHub access token not set.</p>
                )
            }
            <hr />
            <GitHubLoginWindow
                defaultScope="repo"
                onChange={() => {}}
            />
            {/* <hr /> */}
            {/* {
                resetTokenVisible ? (
                    <GitHubLoginWindow
                        onChange={() => reloadToken()}
                    />
                ) : (
                    <Button onClick={() => setResetTokenVisible(true)}>Reset access token</Button>
                )
            } */}
        </div>
    )
}

export default GitHubPermissionsWindow