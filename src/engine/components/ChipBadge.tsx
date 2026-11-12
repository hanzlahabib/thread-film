import {useTheme} from '../theme';
import type {ChipIcon} from '../types';

type Props = {icon: ChipIcon; size: number};

// 24-unit line icons, drawn for the engine.
const PATHS: Record<Exclude<ChipIcon, {initials: string}>, string> = {
  plus: 'M12 5v14 M5 12h14',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4z M4 8l8 4 8-4 M12 12v8',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
  card: 'M3 6h18v12H3z M3 10h18 M7 15h4',
  mail: 'M3 6h18v12H3z M3 7l9 6 9-6',
  reply: 'M10 8L5 12l5 4 M5 12h9a5 5 0 0 1 5 5v1',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20a8 8 0 0 1 16 0',
  chart: 'M4 20V4 M4 20h16 M8 16l4-5 3 3 5-7',
};

// Round badge at the front of a carried chip: a line icon, or two initials.
export default function ChipBadge({icon, size}: Props) {
  const theme = useTheme();
  const initials = typeof icon === 'object';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: initials ? size * 0.28 : size / 2,
        background: theme.chip.border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 700,
        color: theme.chip.text,
      }}
    >
      {typeof icon === 'object' ? (
        icon.initials
      ) : (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" stroke={theme.chip.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={PATHS[icon]} />
        </svg>
      )}
    </div>
  );
}
