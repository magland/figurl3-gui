import { isEqualTo, isString, default as validateObject } from "../validateObject"

export type GoogleServiceAccountCredentials = {
    type: 'service_account',
    project_id: string,
    private_key_id: string,
    private_key: string,
    client_email: string,
    client_id: string
}

export const isGoogleServiceAccountCredentials = (x: any): x is GoogleServiceAccountCredentials => {
    return validateObject(x, {
        type: isEqualTo('service_account'),
        project_id: isString,
        private_key_id: isString,
        private_key: isString,
        client_email: isString,
        client_id: isString,
    }, {allowAdditionalFields: true})
}