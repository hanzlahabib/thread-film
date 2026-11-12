import type {FrameKind, Theme} from './theme';
import {screenWidth, type Screen} from './types';

export type {FrameKind} from './theme';

/** Proportions of a phone and a tablet body, as fractions of the screen's width, so one rule fits any capture size. */
const DEVICE = {
  phone: {bezel: 0.036, radius: 0.115},
  tablet: {bezel: 0.03, radius: 0.045},
} as const;

/** The chrome a screen is drawn with: its own choice in the journey, else the theme's. */
export function frameKind(screen: Screen, theme: Theme): FrameKind {
  return screen.frame ?? theme.frame.kind;
}

export function isDevice(kind: FrameKind): kind is 'phone' | 'tablet' {
  return kind === 'phone' || kind === 'tablet';
}

/** Thickness of the bezel and corner radius of the glass, in capture pixels. */
export function deviceMetrics(kind: 'phone' | 'tablet', width: number): {bezel: number; radius: number} {
  return {bezel: Math.round(width * DEVICE[kind].bezel), radius: Math.round(width * DEVICE[kind].radius)};
}

/** Space the chrome takes outside the capture, in capture pixels, so the world bounds include it. */
export function chromeInsets(screen: Screen, theme: Theme): {top: number; bottom: number; side: number} {
  const kind = frameKind(screen, theme);
  if (kind === 'browser') return {top: theme.frame.bar, bottom: 0, side: 0};
  if (isDevice(kind)) {
    const {bezel} = deviceMetrics(kind, screenWidth(screen));
    return {top: bezel, bottom: bezel, side: bezel};
  }
  return {top: 0, bottom: 0, side: 0};
}
