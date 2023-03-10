export const RECAPTCHA_KEY: string | undefined = import.meta.env.VITE_RECAPTCHA_KEY

const loadReCaptchaScript = async () => {
    const x = (window as any).grecaptcha
    if (x) return x
    return new Promise<any>((resolve) => {
        const script = document.createElement('script')
        script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_KEY}`
        script.id = 'recaptcha'
        document.body.appendChild(script)
        script.onload = () => {
            resolve((window as any).grecaptcha)
        }
    })
}

export const getReCaptchaToken = async () => {
    const grecaptcha = await loadReCaptchaScript()
    return new Promise<string>((resolve) => {
        grecaptcha.ready(() => {
            grecaptcha.execute(RECAPTCHA_KEY, {action: 'submit'}).then(function(token: string) {
                resolve(token)
            });
        })
    })
}