const sleepMsec = async (msec: number): Promise<void> => {
    const m = msec
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, m)
    })
}

export default sleepMsec