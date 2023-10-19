import { ThemeProvider } from '@mui/private-theming'
import { BrowserRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow/MainWindow'
import SetupRtcshare from './Rtcshare/SetupRtcshare'
import theme from './theme'

// get hide url query parameter
const urlParams = new URLSearchParams(window.location.search)
const hideApplicationBar = urlParams.get('hide') === '1'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <GithubAuthSetup>
          <SetupRtcshare>
            <MainWindow hideApplicationBar={hideApplicationBar} />
          </SetupRtcshare>
        </GithubAuthSetup>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
