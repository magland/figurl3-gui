import React, { FunctionComponent } from 'react';
// import GithubStar from './GithubStar';

type Props = any

const IntroSection: FunctionComponent<Props> = () => {
    return (
        <div className="IntroSection HomeSection">
            <p>&nbsp;</p>
            <img src="/figurl.png" alt="figurl" width="200px" />
            <p>Shareable, interactive scientific figures.</p>
            <p><a href="https://github.com/flatironinstitute/figurl/blob/main/README.md" target="_blank" rel="noreferrer">About</a></p>
            {/* <GithubStar /> */}
        </div>
    )
}

export default IntroSection