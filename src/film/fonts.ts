import {continueRender, delayRender, staticFile} from 'remotion';

// Both faces ship in public/fonts with their licences (SIL OFL 1.1), so a render never depends on what the
// machine has installed or on the network. Imported once by src/Root.tsx.
const faces = [
  // Inter is a variable font: one file covers every weight.
  {family: 'Inter', file: 'fonts/Inter-Variable.woff2', weight: '100 900'},
  // Instrument Serif has a single weight; declaring the full range stops the browser from faking a bold.
  {family: 'Instrument Serif', file: 'fonts/InstrumentSerif-Regular.ttf', weight: '100 900'},
];

for (const {family, file, weight} of faces) {
  const handle = delayRender(`Loading font ${family}`);
  new FontFace(family, `url(${staticFile(file)})`, {weight})
    .load()
    .then((face) => {
      (document.fonts as FontFaceSet & {add(face: FontFace): void}).add(face);
      continueRender(handle);
    })
    .catch((error: unknown) => {
      throw new Error(`Could not load the font "${family}" from public/${file}`, {cause: error});
    });
}
