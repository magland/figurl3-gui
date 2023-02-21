import { FunctionComponent, useMemo } from "react";
import NiceTable from "../../components/NiceTable/NiceTable";

type Props ={
	fileManifest: {uri: string, name?: string, size?: number}[]
}

const columns = [
	{
		key: 'uri',
		label: 'URI'
	},
	{
		key: 'name',
		label: 'Name'
	},
	{
		key: 'size',
		label: 'Size'
	}
]

const FileManifestTable: FunctionComponent<Props> = ({fileManifest}) => {
	const rows = useMemo(() => (
		fileManifest.map(a => ({
			key: a.uri,
			columnValues: {
				uri: a.uri,
				name: a.name || '',
				size: a.size || ''
			}
		}))
	), [fileManifest])
	return (
		<NiceTable
			columns={columns}
			rows={rows}
		/>
	)
}

export default FileManifestTable
