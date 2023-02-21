import { AppBar, Toolbar } from "@mui/material";
import { FunctionComponent, useCallback, useMemo, useState } from "react";
import ModalWindow from "../components/ModalWindow/ModalWindow";
import GitHubLoginWindow from "../GitHub/GitHubLoginWindow";
import { useGithubAuth } from "../GithubAuth/useGithubAuth";
import { useRoute2 } from "../Route/useRoute2";
import useWindowDimensions from "../useWindowDimensions";
import GitHubAccessControl from "./GitHubAccessControl/GitHubAccessControl";
import LocalKacheryControl from "./LocalKacheryControl";
import LocalKacheryDialog from "./LocalKacheryDialog";
import logo from './logo.png'
import SaveFigureControl from "./SaveFigure/SaveFigureControl";
import SaveFigureDialog from "./SaveFigure/SaveFigureDialog";

type Props = {
    applicationBarHeight: number
    title: string
}

const ApplicationBar: FunctionComponent<Props> = ({applicationBarHeight, title}) => {
    const {routePath, setRoute} = useRoute2()
    const {signedIn, userId} = useGithubAuth()

    const {visible: saveFigureVisible, handleOpen: openSaveFigure, handleClose: closeSaveFigure} = useModalDialog()
    const {visible: localKacheryVisible, handleOpen: openLocalKachery, handleClose: closeLocalKachery} = useModalDialog()
    const {visible: githubAccessWindowVisible, handleOpen: openGitHubAccessWindow, handleClose: closeGitHubAccessWindow} = useModalDialog()

    const onHome = useCallback(() => {
        setRoute({routePath: '/home', dataUri: '', label: ''})
    }, [setRoute])

    return (
        <span>
            <AppBar position="static" style={{height: applicationBarHeight, color: 'white', background: '#65a6fc'}}>
                <Toolbar style={{minHeight: 50}}>
                    <img src={logo} alt="logo" height={30} style={{paddingBottom: 5, cursor: 'pointer'}} onClick={onHome} />
                    <div>&nbsp;&nbsp;&nbsp;{title}</div>
                    <span style={{marginLeft: 'auto'}} />
                    {
                        <span style={{paddingBottom: 0, color: 'white'}}>
                            <LocalKacheryControl onClick={openLocalKachery} />
                        </span>
                    }
                    {
                        routePath === '/f' && (
                            <span style={{paddingBottom: 0, color: 'white'}}>
                                <SaveFigureControl onClick={openSaveFigure} color="white" />
                            </span>
                        )
                    }
                    {
                        signedIn && (
                            <span style={{fontFamily: 'courier', color: 'lightgray', cursor: 'pointer'}} title={`Signed in as ${userId}`}>{userId}&nbsp;&nbsp;</span>
                        )
                    }
                    <span style={{paddingBottom: 0, color: 'white'}} title={signedIn ? "Manage GitHub sign in" : "Sign in with GitHub"}>
                        <GitHubAccessControl onOpen={openGitHubAccessWindow} />
                        &nbsp;
                    </span>
                </Toolbar>
            </AppBar>
            <ModalWindow
                open={localKacheryVisible}
                onClose={closeLocalKachery}
            >
                <LocalKacheryDialog
                    onClose={closeLocalKachery}
                />
            </ModalWindow>
            <ModalWindow
                open={saveFigureVisible}
                onClose={closeSaveFigure}
            >
                <SaveFigureDialog
                    onClose={closeSaveFigure}
                />
            </ModalWindow>
            <ModalWindow
                open={githubAccessWindowVisible}
                onClose={closeGitHubAccessWindow}
            >
                <GitHubLoginWindow
                    defaultScope=""
                    onClose={() => closeGitHubAccessWindow()} onChange={() => {}}
                />
            </ModalWindow>
        </span>
    )
}

export const useModalDialog = () => {
    const [visible, setVisible] = useState<boolean>(false)
    const handleOpen = useCallback(() => {
        setVisible(true)
    }, [])
    const handleClose = useCallback(() => {
        setVisible(false)
    }, [])
    return useMemo(() => ({
        visible,
        handleOpen,
        handleClose
    }), [visible, handleOpen, handleClose])
}

export default ApplicationBar