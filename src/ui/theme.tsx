import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { useWallet } from '../state/WalletProvider';
export const lightTheme = {
  dark: false, bg: '#F6F6F1', surface: '#FFFFFF', text: '#243C33', muted: '#6F7D75',
  border: '#E5E9E1', primary: '#31594B', soft: '#E9EFE6', warning: '#9B611C',
  warningBg: '#FBF0DE', danger: '#B14848', hero: '#244C3E', onPrimary: '#FFFFFF',
};
const darkTheme: typeof lightTheme = {
  dark: true, bg: '#111B17', surface: '#1B2821', text: '#EBF0E6', muted: '#A4B2A7',
  border: '#304037', primary: '#AFD2B8', soft: '#2D4134', warning: '#F3C079',
  warningBg: '#3B3021', danger: '#F29999', hero: '#244C3E', onPrimary: '#142A1D',
};
const ThemeContext = createContext(lightTheme);
export function AppThemeProvider({ children }: React.PropsWithChildren) {
  const { state } = useWallet();
  const system = useColorScheme();
  const dark = state.settings.theme === 'dark' || (state.settings.theme === 'system' && system === 'dark');
  return <ThemeContext.Provider value={dark ? darkTheme : lightTheme}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
