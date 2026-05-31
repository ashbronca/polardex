// Polardex mobile theme — ported from the web app's token system
// (src/theme/theme.ts). Colours (the Nord palette) carry over verbatim; spacing,
// radius and font sizes are converted from rem strings to React Native numbers.

export interface Theme {
  color: {
    surface: { base: string; subtle: string; muted: string; footer: string; border: string };
    text: { primary: string; secondary: string; tertiary: string; inverse: string };
    frost: { teal: string; sky: string; blue: string; deep: string };
    aurora: {
      red: string; orange: string; yellow: string; green: string; purple: string;
      greenLight: string; orangeLight: string; yellowLight: string;
    };
  };
  space: { 1: number; 2: number; 3: number; 4: number; 5: number; 6: number; 8: number; 10: number; 12: number; 16: number; 20: number };
  radius: { none: number; sm: number; md: number; lg: number; xl: number; full: number };
  fontSize: { xxs: number; xs: number; sm: number; md: number; lg: number; xl: number; xxl: number; xxxl: number };
  fontWeight: { light: '300'; regular: '400'; medium: '500'; semibold: '600'; bold: '700'; heavy: '900' };
}

const frost = { teal: '#8fbcbb', sky: '#88c0d0', blue: '#81a1c1', deep: '#5e81ac' };
const aurora = {
  red: '#bf616a', orange: '#d08770', yellow: '#ebcb8b', green: '#a3be8c', purple: '#b48ead',
  greenLight: '#c8e6a0', orangeLight: '#ffd89a', yellowLight: '#ffd266',
};

const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80 } as const;
const radius = { none: 0, sm: 4, md: 8, lg: 16, xl: 24, full: 9999 } as const;
const fontSize = { xxs: 10, xs: 12, sm: 14, md: 16, lg: 19, xl: 24, xxl: 32, xxxl: 40 } as const;
const fontWeight = { light: '300', regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '900' } as const;

export const lightTheme: Theme = {
  color: {
    surface: { base: '#ffffff', subtle: '#fbfbfc', muted: '#f2f4f8', footer: '#f4f6f9', border: '#dde2ea' },
    text: { primary: '#4c566a', secondary: 'rgb(123, 136, 161)', tertiary: '#d8dee9', inverse: '#eceff4' },
    frost, aurora,
  },
  space, radius, fontSize, fontWeight,
};

export const darkTheme: Theme = {
  ...lightTheme,
  color: {
    surface: { base: '#2e3440', subtle: '#3b4252', muted: '#434c5e', footer: '#242831', border: '#3d4659' },
    text: { primary: '#eceff4', secondary: '#d8dee9', tertiary: '#4c566a', inverse: '#eceff4' },
    frost, aurora,
  },
};
