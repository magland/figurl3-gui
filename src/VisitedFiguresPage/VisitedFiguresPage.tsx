import { FunctionComponent, useEffect, useState } from "react"
import { GetVisitedFiguresRequest, VisitedFigure, isGetVisitedFiguresResponse, isVisitedFigureResponse } from "../MainWindow/SaveFigure/VisitedFigureRequest"
import { postVisitedFigureRequest } from "../MainWindow/SaveFigure/postFigureRequest"
import { Hyperlink } from "@fi-sci/misc"
import { timeSince } from "../HomePage/SavedFiguresTable"

type VisitedFiguresPageProps = {
    // none
}

const VisitedFiguresPage: FunctionComponent<VisitedFiguresPageProps> = () => {
    const visitedFigures = useVisitedFigures()
    return (
        <div>
            <h3>Visited Figures</h3>
            <table className="scientific-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>View</th>
                        <th>Data</th>
                        <th>Zone</th>
                        <th>Label</th>
                        <th>Num Visits</th>
                        <th>Last Visited</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        visitedFigures.map((f, index) => (
                            <tr key={index}>
                                <td>
                                    <Hyperlink
                                        onClick={() => {
                                            window.open(f.figureUrl, '_blank')
                                        }}
                                    >
                                        OPEN
                                    </Hyperlink>
                                </td>
                                <td>{f.viewUri}</td>
                                <td>{f.dataUri}</td>
                                <td>{f.zone}</td>
                                <td>{f.label}</td>
                                <td>{f.numVisits}</td>
                                <td>
                                    {timeSince(f.lastVisitedTimestamp)}
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    )
}

const useVisitedFigures = (): VisitedFigure[] => {
    const [visitedFigures, setVisitedFigures] = useState<VisitedFigure[]>([])

    useEffect(() => {
        let canceled = false
        const load = async () => {
            const req: GetVisitedFiguresRequest = {
                type: 'getVisitedFigures'
            }
            const response = await postVisitedFigureRequest(req)
            if (!isGetVisitedFiguresResponse(response)) {
                console.warn('Invalid response', response)
                return
            }
            if (canceled) return
            setVisitedFigures(response.visitedFigures)
        }
        load()
        return () => {
            canceled = true
        }
    }, [])

    return visitedFigures
}

export default VisitedFiguresPage