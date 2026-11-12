import type {CSSProperties} from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';

type Props = {
  text: string;
  startFrame: number;
  /** 'line' lifts the whole text at once; 'word' and 'letter' stagger the units. */
  by?: 'line' | 'word' | 'letter';
  /** Frames between units in 'word' and 'letter' mode. */
  stagger?: number;
  style?: CSSProperties;
};

function split(text: string, by: 'line' | 'word' | 'letter'): string[] {
  if (by === 'letter') return Array.from(text);
  if (by === 'word') return text.split(/\s+/).filter(Boolean);
  return [text];
}

// Kinetic type: every unit rises out of its own overflow mask on a snappy spring, so wrapped text works too.
export default function MaskText({text, startFrame, by = 'line', stagger = 2, style}: Props) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const units = split(text, by);
  return (
    <div style={style}>
      {units.map((u, i) => {
        const p = spring({frame: frame - startFrame - i * stagger, fps, config: {damping: 18, stiffness: 150, mass: 0.8}});
        return (
          <span
            key={i}
            // The mask needs vertical padding or descenders are clipped; the negative margin keeps the line height.
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              verticalAlign: 'top',
              paddingBottom: '0.16em',
              marginBottom: '-0.16em',
              marginRight: by === 'word' && i < units.length - 1 ? '0.26em' : 0,
            }}
          >
            <span style={{display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${(1 - p) * 118}%)`}}>{u}</span>
          </span>
        );
      })}
    </div>
  );
}
