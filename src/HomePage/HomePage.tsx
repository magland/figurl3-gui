import { FunctionComponent } from "react";
import { useGithubAuth } from "../GithubAuth/useGithubAuth";
import IntroSection from "./IntroSection";
import SavedFiguresTable from "./SavedFiguresTable";

type Props = any

const HomePage: FunctionComponent<Props> = () => {
    const {signedIn} = useGithubAuth()

    return (
        <div style={{margin: 'auto', maxWidth: 1200, paddingLeft: 10, paddingRight: 10}}>
            <IntroSection />
            
            {
                signedIn ? (
                    <SavedFiguresTable />
                ) : (
                    <h3>Sign in to see your saved figures</h3>
                )
            }

            <span>
                <hr />
            </span>
        </div>
    )
}

export default HomePage