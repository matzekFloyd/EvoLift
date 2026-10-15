import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("../evo-lift/node_modules/sharp");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markSvg = readFileSync(path.join(root, "evo-lift", "brand", "logo-plate.svg"));
const res = path.join(root, "android", "app", "src", "main", "res");
const plate = { r: 56, g: 189, b: 248, alpha: 1 };
const splash = { r: 240, g: 249, b: 255, alpha: 1 };

const launcherSizes = [
  ["mipmap-mdpi", 48],
  ["mipmap-hdpi", 72],
  ["mipmap-xhdpi", 96],
  ["mipmap-xxhdpi", 144],
  ["mipmap-xxxhdpi", 192],
];

const foregroundSizes = [
  ["mipmap-mdpi", 108],
  ["mipmap-hdpi", 162],
  ["mipmap-xhdpi", 216],
  ["mipmap-xxhdpi", 324],
  ["mipmap-xxxhdpi", 432],
];

const splashSizes = [
  ["drawable", 480, 320],
  ["drawable-land-mdpi", 480, 320],
  ["drawable-land-hdpi", 800, 480],
  ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960],
  ["drawable-land-xxxhdpi", 1920, 1280],
  ["drawable-port-mdpi", 320, 480],
  ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280],
  ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920],
];

async function mark(size) {
  return sharp(markSvg).resize(size, size).png().toBuffer();
}

async function compose(width, height, markSize, background) {
  return sharp({
    create: { width, height, channels: 4, background },
  })
    .composite([{ input: await mark(markSize), gravity: "centre" }])
    .png()
    .toBuffer();
}

for (const [dir, size] of launcherSizes) {
  const png = await compose(size, size, size, plate);
  const folder = path.join(res, dir);
  await sharp(png).toFile(path.join(folder, "ic_launcher.png"));
  await sharp(png).toFile(path.join(folder, "ic_launcher_round.png"));
}

for (const [dir, size] of foregroundSizes) {
  const safe = Math.round(size * (66 / 108));
  const png = await compose(size, size, safe, { r: 0, g: 0, b: 0, alpha: 0 });
  await sharp(png).toFile(path.join(res, dir, "ic_launcher_foreground.png"));
}

for (const [dir, width, height] of splashSizes) {
  const markSize = Math.round(Math.min(width, height) * 0.28);
  const png = await compose(width, height, markSize, splash);
  await sharp(png).toFile(path.join(res, dir, "splash.png"));
}

console.log("wrote EvoLift launcher and splash images");
