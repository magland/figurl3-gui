import { ThemeProvider } from '@mui/private-theming'
import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow/MainWindow'
import { useRoute2 } from './Route/useRoute2'
import theme from './theme'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <GithubAuthSetup>
          <MainWindow hideApplicationBar={false} />
        </GithubAuthSetup>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
