import { Checkbox } from '@mui/material';
import axios from 'axios';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import Hyperlink from '../components/Hyperlink/Hyperlink';

type Props = {
    onClose: () => void
}

export const localKacheryServerBaseUrl = 'http://localhost:61442'
let _localKacheryServerIsAvailable: boolean | undefined = undefined
export const localKacheryServerIsAvailable = async ({retry}: {retry: boolean}) => {
    if ((_localKacheryServerIsAvailable === undefined) || (retry)) {
        try {
            const rrr = await axios.get(`${localKacheryServerBaseUrl}/probe`)
            _localKacheryServerIsAvailable = (rrr.status === 200)
        }
        catch(err) {
            _localKacheryServerIsAvailable = false
        }
    }
    return _localKacheryServerIsAvailable
}

export const localKacheryServerIsEnabled = () => {
    const c = getLocalKacheryConfig()
    return c.enabled ? true : false
}

export const getLocalKacheryConfig = () => {
    const json = localStorage.getItem('localKacheryConfig')
    if (!json) return {}
    try {
        return JSON.parse(json)
    }
    catch(err) {
        return {}
    }
}

export const setLocalKacheryConfig = (c: any) => {
    localStorage.setItem('localKacheryConfig', JSON.stringify(c))
}

const LocalKacheryDialog: FunctionComponent<Props> = ({onClose}) => {
    const [isAvailable, setIsAvailable] = useState<boolean>(false)
    const [isEnabled, setIsEnabled] = useState<boolean>(false)
    const [refreshCode, setRefreshCode] = useState<number>(0)
    const [showRefreshPageMessage, setShowRefreshPageMessage] = useState<boolean>(false)
    useEffect(() => {
        localKacheryServerIsAvailable({retry: true}).then(available => {
            setIsAvailable(available)
        })
    }, [refreshCode])
    useEffect(() => {
        setIsEnabled(localKacheryServerIsEnabled())
    }, [refreshCode])
    const toggleEnabled = useCallback(() => {
        const c = getLocalKacheryConfig()
        setLocalKacheryConfig({...c, enabled: c.enabled ? false : true})
        setShowRefreshPageMessage(true)
        setRefreshCode(c => (c + 1))
    }, [])
    return (
        <div style={{overflowY: 'auto'}}>
            <h2>Connect to local Kachery server</h2>
            <p>
                Connecting to a local Kachery server can dramatically speed up the loading of large data files
                for figures.
            </p>
            <ul>
                <li>Step 1: Run a local Kachery server on this computer (see below)</li>
                <li>Step 2: Check the box below to enable this feature.</li>
                <li>Step 3: Reload this page.</li>
            </ul>

            <Checkbox checked={isEnabled} onClick={toggleEnabled} /> Connect to local Kachery server

            <div>
                {
                    isAvailable ? (
                        <span style={{color: 'green'}}>Local server is available.</span>
                    ) : (
                        <span style={{color: 'red'}}>Local server is not available.</span>
                    )
                }
                &nbsp;&nbsp;&nbsp;<Hyperlink onClick={() => setRefreshCode(c => (c + 1))}>Retry</Hyperlink>
            </div>

            {
                showRefreshPageMessage && (
                    <div style={{color: 'orange', fontWeight: 'bold'}}>
                        Reload this page for your changes to take effect
                    </div>
                )
            }

            <h3>Running a local Kachery server</h3>

            <p>
                To run a local Kachery server, install a recent version of <a href="https://nodejs.dev/en/learn/how-to-install-nodejs/" target="_blank" rel="noreferrer">NodeJS</a>. Then run the following command and keep the terminal open.
            </p>

            <pre>npx kachery-local-server@latest serve</pre>

            <p>For more information, see <a href="https://github.com/scratchrealm/kachery-local-server/blob/main/README.md" target="_blank" rel="noreferrer">kachery-local-server</a>.
            </p>

            <h2>How it works</h2>
            <p>
                When a data file is downloaded from the Kachery cloud to the browser,
                the content is sent to the local Kachery server, which saves it to the
                Kachery storage directory. On subsequent page loads, the file is
                retrieved directly from the local server, rather than loading from the
                cloud. This system is possible because Kachery uses content-addressable
                storage.
            </p>
        </div>
    )
}

export default LocalKacheryDialog