import type {Theme} from '../../engine';

// Dark world for the dark captures. Amber thread: the Fernwick screens are green, so a warm line never
// disappears into them. Inter throughout.
export const dark: Theme = {
  mode: 'dark',
  // The mood of the music bed: 'calm', 'driven' or 'minimal'. Optional; calm is the default.
  audio: {mood: 'calm'},
  bg: '#0a0f0d',
  grid: 'rgba(255,255,255,0.04)',
  surface: '#141c19',
  border: '#27332e',
  text: '#f3f6f4',
  textMuted: '#9fb0a8',
  accent: '#ffb547',
  accentContrast: '#1a1204',
  thread: {color: '#ffb547', width: 4, glow: '255,181,71'},
  radius: 14,
  fontDisplay: 'Inter, "Helvetica Neue", Arial, sans-serif',
  fontBody: 'Inter, "Helvetica Neue", Arial, sans-serif',
  chip: {bg: '#141c19', text: '#f3f6f4', border: '#27332e'},
  frame: {kind: 'browser', bar: 56, bezel: 28, barBg: '#0e1512', urlBg: '#1a2420', urlText: '#9fb0a8', shadow: '0 6px 18px rgba(0,0,0,0.4)'},
};
