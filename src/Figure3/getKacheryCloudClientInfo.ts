import { isKeyPair, KeyPair, publicKeyHexToNodeId } from "./viewInterface/kacheryTypes"
import { createKeyPair, publicKeyToHex } from "./crypto/signatures"

export const getKacheryCloudClientInfo = async (): Promise<{clientId: string, keyPair: KeyPair}> => {
    const keyPair: KeyPair = await getKacheryCloudClientKeyPair()
    // TODO: ask user for permission to do the [purpose] for this visualization plugin
    return {clientId: publicKeyHexToNodeId(publicKeyToHex(keyPair.publicKey)), keyPair}
}

const getKacheryCloudClientKeyPair = async () => {
    // eslint-disable-next-line no-empty-pattern
    for (const {} of [1, 2]) {
        const keyPairJson = localStorage.getItem('kachery-cloud-client-key-pair')
        if (keyPairJson) {
            let keyPair: any
            try {
                keyPair = JSON.parse(keyPairJson)
            }
            catch(err) {
                console.warn('Problem parsing kachery cloud key pair. Generating new key pair.')
                localStorage.removeItem('kachery-cloud-client-key-pair')
                keyPair = null
            }
            if (keyPair) {
                if (isKeyPair(keyPair)) {
                    return keyPair
                }
                else {
                    console.warn('Problem with format of kachery cloud key pair. Generating new key pair.')
                    localStorage.removeItem('kachery-cloud-client-key-pair')
                    keyPair = null
                }
            }
        }
        else {
            console.info('Generating kachery cloud client key pair')
            const keyPair = await createKeyPair()
            const keyPairJson = JSON.stringify(keyPair)
            localStorage.setItem('kachery-cloud-client-key-pair', keyPairJson)
        }
    }
    throw Error('Failed to generate keyPair')
}