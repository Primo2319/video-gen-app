import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  ffmpeg = new FFmpeg();
  if (onLog) ffmpeg.on("log", ({ message }) => onLog(message));

  // Single-threaded core — no SharedArrayBuffer / COOP headers required
  const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ffmpeg;
}

export async function stitchVideos(
  urls: string[],
  onProgress?: (pct: number) => void
): Promise<string> {
  if (urls.length === 1) return urls[0];

  onProgress?.(5);
  const ff = await getFFmpeg();
  onProgress?.(20);

  // Download each clip via the proxy route (avoids CORS from replicate.delivery)
  const fileList: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const res = await fetch(`/api/proxy-video?url=${encodeURIComponent(urls[i])}`);
    const buf = await res.arrayBuffer();
    const name = `clip${i}.mp4`;
    await ff.writeFile(name, new Uint8Array(buf));
    fileList.push(`file '${name}'`);
    onProgress?.(20 + ((i + 1) / urls.length) * 55);
  }

  await ff.writeFile("concat.txt", fileList.join("\n"));
  onProgress?.(80);

  // Copy-concat: no re-encoding, very fast
  await ff.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "output.mp4"]);
  onProgress?.(95);

  const data = (await ff.readFile("output.mp4")) as Uint8Array;
  // Copy into a plain ArrayBuffer — Uint8Array may be backed by SharedArrayBuffer
  // which Blob does not accept as a BlobPart.
  const plain = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const blob = new Blob([plain as ArrayBuffer], { type: "video/mp4" });
  onProgress?.(100);
  return URL.createObjectURL(blob);
}
