import type {Theme} from '../../engine';

// The look of the Dayfold phone film. The screens are violet, so the thread is a warm coral that never
// disappears into them. Every screen is a phone: the frame kind is set here for the whole film.
export const mobileDark: Theme = {
  mode: 'dark',
  bg: '#07080b',
  grid: 'rgba(255,255,255,0.035)',
  surface: '#14171d',
  border: '#272b35',
  text: '#f1f2f6',
  textMuted: '#9aa1b1',
  accent: '#ff7a59',
  accentContrast: '#220b04',
  thread: {color: '#ff7a59', width: 4, glow: '255,122,89'},
  radius: 14,
  fontDisplay: 'Inter, "Helvetica Neue", Arial, sans-serif',
  fontBody: 'Inter, "Helvetica Neue", Arial, sans-serif',
  chip: {bg: '#14171d', text: '#f1f2f6', border: '#272b35'},
  frame: {kind: 'phone', bar: 0, barBg: '#20242d', urlBg: '#20242d', urlText: '#9aa1b1', shadow: '0 10px 28px rgba(0,0,0,0.5)'},
};

export const mobileLight: Theme = {
  mode: 'light',
  bg: '#e8eaf0',
  grid: 'rgba(20,24,40,0.06)',
  surface: '#ffffff',
  border: '#cdd2de',
  text: '#14161d',
  textMuted: '#5d6475',
  accent: '#e04526',
  accentContrast: '#ffffff',
  thread: {color: '#e04526', width: 4, glow: '224,69,38'},
  radius: 14,
  fontDisplay: 'Inter, "Helvetica Neue", Arial, sans-serif',
  fontBody: 'Inter, "Helvetica Neue", Arial, sans-serif',
  chip: {bg: '#ffffff', text: '#14161d', border: '#cdd2de'},
  frame: {kind: 'phone', bar: 0, barBg: '#f6f7fa', urlBg: '#e3e6ee', urlText: '#5d6475', shadow: '0 10px 28px rgba(20,24,50,0.18)'},
};
