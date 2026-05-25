import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const I2V_MODEL = "wavespeedai/wan-2.1-i2v-480p";
const T2V_MODEL = "wavespeedai/wan-2.1-t2v-720p";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Collect all REPLICATE_API_TOKEN* env vars into an ordered pool. */
function getKeyPool(): string[] {
  const pool: string[] = [];
  // Primary key
  if (process.env.REPLICATE_API_TOKEN) pool.push(process.env.REPLICATE_API_TOKEN);
  // Additional keys: REPLICATE_API_TOKEN_2 … REPLICATE_API_TOKEN_10
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`REPLICATE_API_TOKEN_${i}`];
    if (k) pool.push(k);
  }
  return pool;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, image, aspectRatio } = await request.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const keyPool = getKeyPool();
    if (keyPool.length === 0) {
      return NextResponse.json(
        { error: "Video generation is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    const modelId = image ? I2V_MODEL : T2V_MODEL;
    const input: Record<string, unknown> = {
      prompt: prompt.trim(),
      negative_prompt: "blurry, low quality, distorted, watermark",
      aspect_ratio: aspectRatio === "9:16" ? "9:16" : "16:9",
      fast_mode: "Balanced",
    };
    if (image) input.image = image;

    // Try each key in order; skip to next on 402 (credits exhausted)
    for (let ki = 0; ki < keyPool.length; ki++) {
      const token = keyPool[ki];
      const replicate = new Replicate({ auth: token });

      let skipToNext = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const prediction = await replicate.predictions.create({ model: modelId, input });
          // Return key index so the status route can poll with the same key
          return NextResponse.json({ id: prediction.id, status: prediction.status, ki });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes("402") ||
            msg.toLowerCase().includes("insufficient credit") ||
            msg.toLowerCase().includes("payment required")
          ) {
            skipToNext = true;
            break;
          }
          if (
            msg.includes("429") ||
            msg.includes("Too Many Requests") ||
            msg.includes("throttled")
          ) {
            await sleep(15000 * (attempt + 1));
          } else {
            throw err;
          }
        }
      }
      if (!skipToNext) break; // rate-limit retries exhausted — bail out (don't silently skip)
    }

    return NextResponse.json(
      { error: "Video generation is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
