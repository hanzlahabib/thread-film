import {useVideoConfig} from 'remotion';
import {makeFrame, type Frame} from './model';

/** Size and orientation of the composition being rendered; every component adapts from this. */
export function useFrame(): Frame {
  const {width, height} = useVideoConfig();
  return makeFrame(width, height);
}
