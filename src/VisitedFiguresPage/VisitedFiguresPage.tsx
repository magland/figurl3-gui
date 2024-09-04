import { Hyperlink } from "@fi-sci/misc"
import { FunctionComponent, useCallback, useEffect, useState } from "react"
import { timeSince } from "../HomePage/SavedFiguresTable"
import { GetVisitedFiguresRequest, VisitedFigure, isGetVisitedFiguresResponse } from "../MainWindow/SaveFigure/VisitedFigureRequest"
import { postVisitedFigureRequest } from "../MainWindow/SaveFigure/postFigureRequest"

type VisitedFiguresPageProps = {
    // none
}

const VisitedFiguresPage: FunctionComponent<VisitedFiguresPageProps> = () => {
    const {passcode, setPasscode} = usePasscode()
    const visitedFigures = useVisitedFigures(passcode)
    return (
        <div>
            <h3>Visited Figures</h3>
            <EditPasscodeComponent passcode={passcode} setPasscode={setPasscode} />
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

const EditPasscodeComponent: FunctionComponent<{passcode: string, setPasscode: (passcode: string) => void}> = ({passcode, setPasscode}) => {
    const [newPasscode, setNewPasscode] = useState<string>(passcode)
    return (
        <div>
            <label>
                Passcode:
                <input
                    type="password"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                />
            </label>
            <button
                onClick={() => {
                    setPasscode(newPasscode)
                }}
            >
                Set Passcode
            </button>
        </div>
    )
}

const usePasscode = () => {
    const [pc, setPc] = useState<string>(localStorage.getItem('visitedFiguresPasscode') || '')
    const setPasscode = useCallback((passcode: string) => {
        setPc(passcode)
        localStorage.setItem('visitedFiguresPasscode', passcode)
    }, [])
    return {passcode: pc, setPasscode}
}

const useVisitedFigures = (passcode: string): VisitedFigure[] => {
    const [visitedFigures, setVisitedFigures] = useState<VisitedFigure[]>([])

    useEffect(() => {
        let canceled = false
        const load = async () => {
            const req: GetVisitedFiguresRequest = {
                type: 'getVisitedFigures',
                passcode
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
    }, [passcode])

    return visitedFigures
}

export default VisitedFiguresPage