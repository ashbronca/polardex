// Polardex mobile theme — ported from the web app's token system, with mobile
// extras for the glassmorphic UI: real SF Pro Rounded font families, an
// immersive gradient backdrop, and an accent glow.

export interface Theme {
  dark: boolean;
  color: {
    surface: { base: string; subtle: string; muted: string; footer: string; border: string };
    text: { primary: string; secondary: string; tertiary: string; inverse: string };
    frost: { teal: string; sky: string; blue: string; deep: string };
    aurora: {
      red: string; orange: string; yellow: string; green: string; purple: string;
      greenLight: string; orangeLight: string; yellowLight: string;
    };
  };
  // Immersive background gradient (top → bottom) and a glow accent for ambiance.
  gradient: [string, string, string];
  accent: string;
  glass: { tint: 'light' | 'dark'; border: string; fill: string };
  space: { 1: number; 2: number; 3: number; 4: number; 5: number; 6: number; 8: number; 10: number; 12: number; 16: number; 20: number };
  radius: { none: number; sm: number; md: number; lg: number; xl: number; full: number };
  fontSize: { xxs: number; xs: number; sm: number; md: number; lg: number; xl: number; xxl: number; xxxl: number };
  // RN custom fonts are per-weight families (not fontWeight). These map to the
  // expo-font keys loaded in _layout. Falls back to system if not yet loaded.
  font: { regular: string; medium: string; semibold: string; bold: string; heavy: string };
}

const frost = { teal: '#8fbcbb', sky: '#88c0d0', blue: '#81a1c1', deep: '#5e81ac' };
const aurora = {
  red: '#bf616a', orange: '#d08770', yellow: '#ebcb8b', green: '#a3be8c', purple: '#b48ead',
  greenLight: '#c8e6a0', orangeLight: '#ffd89a', yellowLight: '#ffd266',
};

const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80 } as const;
const radius = { none: 0, sm: 4, md: 8, lg: 16, xl: 24, full: 9999 } as const;
const fontSize = { xxs: 10, xs: 12, sm: 14, md: 16, lg: 19, xl: 24, xxl: 32, xxxl: 40 } as const;
const font = {
  regular: 'SFProRounded-Regular',
  medium: 'SFProRounded-Medium',
  semibold: 'SFProRounded-Semibold',
  bold: 'SFProRounded-Bold',
  heavy: 'SFProRounded-Heavy',
} as const;

export const darkTheme: Theme = {
  dark: true,
  color: {
    surface: { base: '#2e3440', subtle: '#3b4252', muted: '#434c5e', footer: '#242831', border: '#3d4659' },
    text: { primary: '#eceff4', secondary: '#c4ccda', tertiary: '#7b88a1', inverse: '#eceff4' },
    frost, aurora,
  },
  gradient: ['#191d25', '#262c38', '#343d50'],
  accent: frost.sky,
  glass: { tint: 'dark', border: 'rgba(255,255,255,0.14)', fill: 'rgba(255,255,255,0.06)' },
  space, radius, fontSize, font,
};

export const lightTheme: Theme = {
  dark: false,
  color: {
    surface: { base: '#ffffff', subtle: '#fbfbfc', muted: '#eef1f6', footer: '#f4f6f9', border: '#dde2ea' },
    text: { primary: '#3b4252', secondary: 'rgb(110, 122, 145)', tertiary: '#aab4c5', inverse: '#eceff4' },
    frost, aurora,
  },
  gradient: ['#dfe6f1', '#eaeff6', '#f7f9fc'],
  accent: frost.deep,
  glass: { tint: 'light', border: 'rgba(255,255,255,0.6)', fill: 'rgba(255,255,255,0.45)' },
  space, radius, fontSize, font,
};
