import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import Hyperlink from '../components/Hyperlink/Hyperlink';
import NiceTable from '../components/NiceTable/NiceTable';
import { useGithubAuth } from '../GithubAuth/useGithubAuth';
import { DeleteFigureRequest, Figure, GetFiguresRequest, isDeleteFigureResponse, isGetFiguresResponse } from '../MainWindow/SaveFigure/FigureRequest';
import postFigureRequest from '../MainWindow/SaveFigure/postFigureRequest';
import { computeSizeStringFromFileManifest } from '../MainWindow/SaveFigure/SaveFigureDialog';

type Props = any

const useFigures = () => {
    const {userId, accessToken} = useGithubAuth()
    const [figures, setFigures] = useState<Figure[] | undefined>(undefined)
    const [updateCode, setUpdateCode] = useState<number>(0)
    const incrementUpdateCode = useCallback(() => {setUpdateCode(c => (c+1))}, [])
    useEffect(() => {
        setFigures(undefined)
        if (!userId) return
        if (!accessToken) return
        let canceled = false
        ;(async () => {
            const req: GetFiguresRequest = {
                type: 'getFigures',
                ownerId: userId.toString(),
                auth: {
                    userId: userId.toString(),
                    githubAccessToken: accessToken
                }
            }
            const resp = await postFigureRequest(req, {reCaptcha: false})
            if (!isGetFiguresResponse(resp)) {
                throw Error('Unexpected response to getFigures')
            }
            if (canceled) return
            setFigures(resp.figures.sort((a, b) => (b.timestampCreated - a.timestampCreated)))
        })()
        return (() => {
            canceled = true
        })
    }, [userId, updateCode, accessToken])
    const refreshFigures = useCallback(() => {
        incrementUpdateCode()
    }, [incrementUpdateCode])
    const deleteFigure = useCallback((figureId: string) => {
        if (!userId) return
        if (!accessToken) return
        ;(async () => {
            const req: DeleteFigureRequest = {
                type: 'deleteFigure',
                figureId,
                auth: {
                    userId: userId.toString(),
                    githubAccessToken: accessToken
                }
            }
            const resp = await postFigureRequest(req, {reCaptcha: true})
            if (!isDeleteFigureResponse(resp)) {
                throw Error('Unexpected response to deleteFigure')
            }
            refreshFigures()
        })()
    }, [refreshFigures, userId, accessToken])
    return {figures, deleteFigure, refreshFigures}
}

const columns = [
    {
        key: 'label',
        label: 'Label'
    },
    {
        key: 'timestampCreated',
        label: 'Created'
    },
    {
        key: 'viewUri',
        label: 'View'
    },
    {
        key: 'size',
        label: 'Size'
    },
    {
        key: 'notes',
        label: 'Notes'
    }
]

const SavedFiguresTable: FunctionComponent<Props> = () => {
    const {figures, deleteFigure} = useFigures()
    const rows = useMemo(() => (
        figures ? figures.map(figure => {
            const qsParts: string[] = []
            qsParts.push(`v=${figure.viewUri}`)
            qsParts.push(`d=${figure.dataUri}`)
            if (figure.sh) {
                qsParts.push(`sh=${figure.sh}`)
            }
            if (figure.dir) {
                qsParts.push(`dir=${figure.dir}`)
            }
            if (figure.urlState) qsParts.push(`s=${JSON.stringify(figure.urlState)}`)
            qsParts.push(`label=${figure.label}`)
            if (figure.zone) {
                qsParts.push(`zone=${figure.zone}`)
            }
            const qs = qsParts.join('&')
            return {
                key: figure.figureId || '',
                columnValues: {
                    label: {
                        text: figure.label,
                        element: <Hyperlink href={`/f?${qs}`}>{figure.label || '<no label>'}</Hyperlink>
                    },
                    timestampCreated: timeSince(figure.timestampCreated),
                    viewUri: figure.viewUri,
                    size: computeSizeStringFromFileManifest(figure.fileManifest),
                    notes: figure.notes
                }
            }
        }) : []
    ), [figures])

    const handleDeleteFigure = useCallback((figureId: string) => {
        deleteFigure(figureId)
    }, [deleteFigure])

    return (
        <div>
            <h2>Saved figures</h2>
            <NiceTable
                rows={rows}
                columns={columns}
                onDeleteRow={handleDeleteFigure}
            />
        </div>
    )
}

// thanks https://stackoverflow.com/questions/3177836/how-to-format-time-since-xxx-e-g-4-minutes-ago-similar-to-stack-exchange-site
export function timeSince(date: number) {
    const seconds = Math.floor((Date.now() - date) / 1000);

    let interval = seconds / 31536000;

    if (interval > 1) {
        return Math.floor(interval) + " years";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " months";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " days";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hours";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}

export default SavedFiguresTable