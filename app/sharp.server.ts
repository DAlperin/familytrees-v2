import sharp from "sharp";
import { rm, rmSync } from "fs";

export async function tileImage(name: string) {
  const version = Date.now();
  await sharp(`./tmp/uploads/${name}`, { limitInputPixels: false })
    .tile({
      layout: "dz",
    })
    .toFile(`./tmp/out/${version}`);
  rmSync(`./tmp/uploads/${name}`);
  return version;
}
