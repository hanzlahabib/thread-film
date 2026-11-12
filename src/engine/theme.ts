import {createContext, useContext} from 'react';

/**
 * Everything about how a film looks. Components read only from here: there is no colour, font or radius
 * anywhere else in the engine. Write one of these per film (see src/film/theme.ts).
 */
export type Theme = {
  /** Follows the product's own mode as shown in the captures. */
  mode: 'dark' | 'light';
  /** The world behind the screens. */
  bg: string;
  /** Grid lines drawn on the world; they drift slower than the camera for parallax. */
  grid: string;
  /** Window frame, chips and HUD pills. */
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  /** Labels at each stop, the end-card button. */
  accent: string;
  /** Text on top of `accent`. */
  accentContrast: string;
  thread: {
    /** The line, its head, the stubs and the arrival rings. One colour for the whole film. */
    color: string;
    /** Stroke width in frame pixels, constant at any zoom. */
    width: number;
    /** Glow colour as "r,g,b" (alpha is applied by the engine). */
    glow: string;
  };
  /** Corner radius of the window frame; match the product's own. */
  radius: number;
  fontDisplay: string;
  fontBody: string;
  chip: {bg: string; text: string; border: string};
  frame: {
    /**
     * Chrome around each capture: a 'browser' window with an address bar, a 'device' bezel, or 'none' for
     * full-bleed captures. A screen can override this in the journey (`Screen.frame`).
     */
    kind: 'browser' | 'device' | 'none';
    /** Height of the browser title bar in capture pixels. */
    bar: number;
    /** Thickness of the device bezel in capture pixels. */
    bezel: number;
    barBg: string;
    urlBg: string;
    urlText: string;
    shadow: string;
  };
};

export const ThemeContext = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme() needs a <ThemeContext.Provider>; render components inside <ThreadFilm>.');
  return theme;
}
