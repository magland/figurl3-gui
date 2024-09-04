import { ThemeProvider } from '@mui/private-theming'
import { BrowserRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow/MainWindow'
import SetupRtcshare from './Rtcshare/SetupRtcshare'
import theme from './theme'
import { postVisitedFigureRequest } from './MainWindow/SaveFigure/postFigureRequest'
import { AddVisitedFigureRequest } from './MainWindow/SaveFigure/VisitedFigureRequest'

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

setTimeout(() => {
  const VITE_ADD_VISITED_FIGURE_CODE = import.meta.env.VITE_ADD_VISITED_FIGURE_CODE;
  const figureUrl = window.location.href;
  if (!figureUrl.startsWith('https://figurl.org/f')) {
    return
  }
  const req: AddVisitedFigureRequest = {
    type: 'addVisitedFigure',
    figureUrl,
    code: VITE_ADD_VISITED_FIGURE_CODE
  }
  postVisitedFigureRequest(req)
}, 5000);

export default App
