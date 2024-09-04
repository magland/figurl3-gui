type RoutePath = '/home' | '/about' | '/status' | '/doc' | '/f' | '/github/auth' | '/visited-figures'
export const isRoutePath = (x: string): x is RoutePath => {
    if (['/home', '/about', '/status', '/doc', '/f', '/github/auth', '/visited-figures'].includes(x)) return true
    return false
}

export default RoutePath