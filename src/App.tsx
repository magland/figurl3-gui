import { ThemeProvider } from '@mui/private-theming'
import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow/MainWindow'
import theme from './theme'

function App() {
  const [count, setCount] = useState(0)

  const testTitle='TODO - change this title'

  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <GithubAuthSetup>
          <MainWindow hideApplicationBar={false} title={testTitle} />
        </GithubAuthSetup>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
