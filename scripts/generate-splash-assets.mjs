/**
 * Generates native splash-screen images from assets/logo.png.
 *
 * iOS SplashScreenLegacy slots: 1×1 fully-transparent PNGs so the storyboard
 *   ImageView shows nothing — only the SplashScreenBackground color (#0A0A0A)
 *   is visible. The JS animated splash handles the logo entrance.
 *
 * Android drawables: the logo mark sized to fit within the 240dp splash icon
 *   area for each density (background color from colors.xml).
 *
 * Run: node scripts/generate-splash-assets.mjs
 */

import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Jimp = require('../node_modules/jimp-compact');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LOGO_SRC = join(ROOT, 'assets', 'logo.png');

const IOS_IMAGESET = join(ROOT, 'ios', 'MastersFit', 'Images.xcassets', 'SplashScreenLegacy.imageset');
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');

// Logo is 581x525 (aspect ~1.1067:1).
const LOGO_ASPECT = 581 / 525;

// iOS: 1×1 transparent placeholder — the ImageView shows nothing, only the
// SplashScreenBackground color (#0A0A0A) is visible. Logo entrance is handled
// entirely by the JS AnimatedSplashScreen component.
const IOS_SLOTS = [
  { file: 'image.png'    },
  { file: 'image@2x.png' },
  { file: 'image@3x.png' },
];

// Android: icon-only at the correct size for each density bucket.
// 240dp icon area: icon height = 240 * density_factor.
const ANDROID_SLOTS = [
  { folder: 'drawable-mdpi',    logoH: 240 },
  { folder: 'drawable-hdpi',    logoH: 360 },
  { folder: 'drawable-xhdpi',   logoH: 480 },
  { folder: 'drawable-xxhdpi',  logoH: 720 },
  { folder: 'drawable-xxxhdpi', logoH: 960 },
];

async function run() {
  const logo = await Jimp.read(LOGO_SRC);
  console.log(`Source: ${logo.getWidth()}x${logo.getHeight()} (logo.png)`);

  // iOS slots — 1×1 transparent placeholder; background color does the work
  for (const { file } of IOS_SLOTS) {
    const blank = await Jimp.create(1, 1, 0x00000000);
    await blank.writeAsync(join(IOS_IMAGESET, file));
    console.log(`iOS  ${file} → 1×1 transparent`);
  }

  // Android drawables — mark only at the right size for each density
  for (const { folder, logoH } of ANDROID_SLOTS) {
    const logoW = Math.round(logoH * LOGO_ASPECT);
    const out = join(ANDROID_RES, folder, 'splashscreen_logo.png');
    await logo.clone().resize(logoW, logoH).writeAsync(out);
    console.log(`Android  ${folder}/splashscreen_logo.png → ${logoW}x${logoH}`);
  }

  console.log('\nDone.');
}

run().catch(err => { console.error(err); process.exit(1); });
