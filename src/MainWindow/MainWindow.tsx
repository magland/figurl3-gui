import { FunctionComponent, useEffect } from "react";
import { useRoute2 } from "../Route/useRoute2";
import Routes from "../Routes/Routes";
import useWindowDimensions from "../useWindowDimensions";
import ApplicationBar from "./ApplicationBar";

type Props = {
    hideApplicationBar: boolean
}

const MainWindow: FunctionComponent<Props> = ({hideApplicationBar}) => {
    const {width, height} = useWindowDimensions()
    const applicationBarHeight = !hideApplicationBar && (height >= 400) ? 50 : 0

    const {label} = useRoute2()

    useEffect(() => {
        const title = label || ''
        document.title = title || 'figurl'
    }, [label])

    return (
        <div>
            <ApplicationBar
                applicationBarHeight={applicationBarHeight}
                title={label || ''}
            />
            <div style={{position: 'absolute', top: applicationBarHeight, width, height: height - applicationBarHeight, overflow: 'auto'}}>
                <Routes
                    width={width}
                    height={height - applicationBarHeight}
                />
            </div>
        </div>
    )
}

export default MainWindow