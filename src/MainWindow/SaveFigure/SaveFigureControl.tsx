import { Save } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { FunctionComponent, useCallback } from 'react';
import { useGithubAuth } from '../../GithubAuth/useGithubAuth';

type Props = {
    onClick: () => void
    color: any
}

const SaveFigureControl: FunctionComponent<Props> = ({ onClick, color }) => {
    // const {signedIn} = useSignedIn()
    const {signedIn} = useGithubAuth()
    const tooltip = signedIn ? 'Save figure' : 'Sign in to save figure'
    const handleClick = useCallback(() => {
        if (!signedIn) {
            alert('You must be signed in to save a figure.')
            return
        }
        onClick()
    }, [signedIn, onClick])
    return (
        <IconButton style={{color}} title={tooltip} onClick={handleClick}><Save /></IconButton>
    );
}

export default SaveFigureControl