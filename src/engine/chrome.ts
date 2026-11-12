import type {Theme} from './theme';
import type {Screen} from './types';

export type FrameKind = 'browser' | 'device' | 'none';

/** The chrome a screen is drawn with: its own choice in the journey, else the theme's. */
export function frameKind(screen: Screen, theme: Theme): FrameKind {
  return screen.frame ?? theme.frame.kind;
}

/** Space the chrome takes outside the capture, in capture pixels, so the world bounds include it. */
export function chromeInsets(screen: Screen, theme: Theme): {top: number; bottom: number; side: number} {
  const kind = frameKind(screen, theme);
  if (kind === 'browser') return {top: theme.frame.bar, bottom: 0, side: 0};
  if (kind === 'device') return {top: theme.frame.bezel, bottom: theme.frame.bezel, side: theme.frame.bezel};
  return {top: 0, bottom: 0, side: 0};
}
