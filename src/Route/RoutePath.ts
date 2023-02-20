type RoutePath = '/home' | '/about' | '/status' | '/doc' | '/f' | '/github/auth'
export const isRoutePath = (x: string): x is RoutePath => {
    if (['/home', '/about', '/status', '/doc', '/f', '/github/auth'].includes(x)) return true
    return false
}

export default RoutePath