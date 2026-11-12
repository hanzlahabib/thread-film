import {Composition} from 'remotion';
import {FPS, ThreadFilm, calculateFilmMetadata, type FilmProps} from './engine';
import './film/fonts';
import {end, hook, journey} from './film/journey';
import {end as mobileEnd, hook as mobileHook, journey as mobileJourney} from './film/mobile/journey';
import {mobileDark, mobileLight} from './film/mobile/themes';
import {theme} from './film/theme';
import {light} from './film/themes/light';
import vo from './film/vo.json';

// Every composition shares one journey: the engine reframes each stop for the shape of the composition.
// film-16x9 and film-9x16 use the active theme (src/film/theme.ts); the -light pair always uses the light one.
const props: FilmProps = {theme, journey, end, hook, vo};
const lightProps: FilmProps = {...props, theme: light};

// The mobile demo: four phone screens, arranged by the engine for each shape (see src/film/mobile/journey.ts).
const mobileProps: FilmProps = {theme: mobileDark, journey: mobileJourney, end: mobileEnd, hook: mobileHook};
const mobileLightProps: FilmProps = {...mobileProps, theme: mobileLight};

const SIZES = {'16x9': {width: 1920, height: 1080}, '9x16': {width: 1080, height: 1920}};

export function Root() {
  return (
    <>
      {Object.entries(SIZES).flatMap(([ratio, size]) => [
        <Composition key={ratio} id={`film-${ratio}`} component={ThreadFilm} {...size} fps={FPS} durationInFrames={1} defaultProps={props} calculateMetadata={calculateFilmMetadata} />,
        <Composition key={`${ratio}-light`} id={`film-${ratio}-light`} component={ThreadFilm} {...size} fps={FPS} durationInFrames={1} defaultProps={lightProps} calculateMetadata={calculateFilmMetadata} />,
      ])}
      <Composition id="mobile-9x16" component={ThreadFilm} {...SIZES['9x16']} fps={FPS} durationInFrames={1} defaultProps={mobileProps} calculateMetadata={calculateFilmMetadata} />
      <Composition id="mobile-9x16-light" component={ThreadFilm} {...SIZES['9x16']} fps={FPS} durationInFrames={1} defaultProps={mobileLightProps} calculateMetadata={calculateFilmMetadata} />
      <Composition id="mobile-16x9" component={ThreadFilm} {...SIZES['16x9']} fps={FPS} durationInFrames={1} defaultProps={mobileProps} calculateMetadata={calculateFilmMetadata} />
    </>
  );
}
