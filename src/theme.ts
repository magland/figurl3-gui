import { createTheme, ThemeOptions } from "@mui/material";
import { lightGreen } from "@mui/material/colors";

const themeOptions: ThemeOptions = {
    palette: {
        primary: { // not sure if this has any effect
            light: '#1122ff',
            main: '#65a6fc',
            dark: '#778899',
            contrastText: '#fff',
        },
        secondary: lightGreen,
    },
    components: {
        MuiAccordionSummary: {
            styleOverrides: {
                root: {
                    '&$expanded': {
                        minHeight: 0,
                        maxHeight: 30,
                        paddingTop: 10
                    },
                    minHeight: 0
                }
            }
        },
        MuiToolbar: {
            styleOverrides: {
                regular: {
                    minHeight: 48,
                    '@media(min-width:600px)' : {
                        minHeight: 48
                    }
                }
            }
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    minHeight: 30,
                    maxHeight: 30
                }
            }
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: 30,
                    maxHeight: 30,
                    padding: '6px 0px'
                }
            }
        }
    }
}

const theme = createTheme(themeOptions);

export default theme;