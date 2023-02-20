import { FunctionComponent } from "react";
import Routes from "../Routes/Routes";
import useWindowDimensions from "../useWindowDimensions";
import ApplicationBar from "./ApplicationBar";

type Props = {
    hideApplicationBar: boolean
    title: string
}

const MainWindow: FunctionComponent<Props> = ({hideApplicationBar, title}) => {
    const {width, height} = useWindowDimensions()
    const applicationBarHeight = !hideApplicationBar && (height >= 400) ? 50 : 0

    return (
        <div>
            <ApplicationBar
                applicationBarHeight={applicationBarHeight}
                title={title}
            />
            <div>
                <Routes
                    width={width}
                    height={height - applicationBarHeight}
                />
            </div>
        </div>
    )
}

export default MainWindow