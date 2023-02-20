import { Album } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { localKacheryServerIsAvailable, localKacheryServerIsEnabled } from './LocalKacheryDialog';

type Props = {
    onClick: () => void
}

const LocalKacheryControl: FunctionComponent<Props> = ({ onClick }) => {
    const [isEnabled, setIsEnabled] = useState(false)
    const [isAvailable, setIsAvailable] = useState(false)
    const color = useMemo(() => {
        if (!isEnabled) return 'white'
        return isAvailable ? 'darkgreen' : 'darkred'
    }, [isEnabled, isAvailable])
    const tooltip = useMemo(() => {
        if (!isEnabled) return "Connect to local Kachery server"
        return isAvailable ? 'Connected to local Kachery server' : 'Not connected to local Kachery server'
    }, [isEnabled, isAvailable])
    useEffect(() => {
        let canceled = false
        function check() {
            if (canceled) return
            localKacheryServerIsAvailable({retry: false}).then((available) => {
                setIsAvailable(available)
            })
            setIsEnabled(localKacheryServerIsEnabled())
            setTimeout(() => {
                check()
            }, 5000)
        }
        check()
        return () => {canceled = true}
    }, [])
    return (
        <IconButton style={{color}} title={tooltip} onClick={onClick}><Album /></IconButton>
    );
}

export default LocalKacheryControl