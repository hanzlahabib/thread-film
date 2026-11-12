import {Config} from '@remotion/cli/config';

// JPEG frames encode much faster than PNG and the film has no alpha channel.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
