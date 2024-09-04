import { FunctionComponent } from 'react'
import Figure3 from '../Figure3/Figure3'
import GitHubAuthPage from '../GitHub/GitHubAuthPage'
import HomePage from '../HomePage/HomePage'
import { useRoute2 } from '../Route/useRoute2'
import VisitedFiguresPage from '../VisitedFiguresPage/VisitedFiguresPage'

type Props = {
    width: number
    height: number
}

const Routes: FunctionComponent<Props> = ({width, height}) => {
    const {routePath, label} = useRoute2()

    if (routePath === '/about') {
        return <div>About</div>
    }
    else if (routePath === '/f') {
        document.title = label

        return (
            <Figure3
                width={width}
                height={height}
            />
        )
    }
    else if (routePath === '/github/auth') {
        document.title = 'figurl github auth'
        return <GitHubAuthPage />
    }
    else if (routePath === '/visited-figures') {
        document.title = 'figurl visited figures'
        return <VisitedFiguresPage />
    }
    else {
        document.title = 'figurl'
        return <HomePage />
    }
}

export default Routes