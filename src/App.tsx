import { ThemeProvider } from '@mui/private-theming'
import { BrowserRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow/MainWindow'
import SetupRtcshare from './Rtcshare/SetupRtcshare'
import theme from './theme'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <GithubAuthSetup>
          <SetupRtcshare>
            <MainWindow hideApplicationBar={false} />
          </SetupRtcshare>
        </GithubAuthSetup>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
