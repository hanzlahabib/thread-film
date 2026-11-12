import type {Theme} from '../../engine';

// Light world for the light captures. Indigo thread against the pale, green-tinted screens, and a serif
// display face over Inter body text for a calmer, editorial feel.
export const light: Theme = {
  mode: 'light',
  audio: {mood: 'calm'},
  bg: '#eef1ee',
  grid: 'rgba(20,40,30,0.06)',
  surface: '#ffffff',
  border: '#d3dad5',
  text: '#14201a',
  textMuted: '#5b6a62',
  accent: '#4338ca',
  accentContrast: '#ffffff',
  thread: {color: '#4338ca', width: 4, glow: '67,56,202'},
  radius: 14,
  fontDisplay: '"Instrument Serif", Georgia, "Times New Roman", serif',
  fontBody: 'Inter, "Helvetica Neue", Arial, sans-serif',
  chip: {bg: '#ffffff', text: '#14201a', border: '#d3dad5'},
  frame: {kind: 'browser', bar: 56, barBg: '#f6f8f6', urlBg: '#e6ebe7', urlText: '#5b6a62', shadow: '0 6px 18px rgba(20,40,30,0.14)'},
};
