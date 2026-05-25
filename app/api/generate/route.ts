import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const I2V_MODEL = "wavespeedai/wan-2.1-i2v-480p";
const T2V_MODEL = "wavespeedai/wan-2.1-t2v-720p";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: NextRequest) {
  try {
    const { prompt, image, aspectRatio } = await request.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const token =
      request.headers.get("X-Replicate-Token") || process.env.REPLICATE_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "No Replicate API key found. Please add your API key in the settings above." },
        { status: 401 }
      );
    }

    const replicate = new Replicate({ auth: token });
    const modelId = image ? I2V_MODEL : T2V_MODEL;

    const input: Record<string, unknown> = {
      prompt: prompt.trim(),
      negative_prompt: "blurry, low quality, distorted, watermark",
      aspect_ratio: aspectRatio === "9:16" ? "9:16" : "16:9",
      fast_mode: "Balanced",
    };
    if (image) input.image = image;

    // Retry up to 4 times on 429 with increasing back-off
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const prediction = await replicate.predictions.create({ model: modelId, input });
        return NextResponse.json({ id: prediction.id, status: prediction.status });
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("throttled")) {
          // Back off: 15s, 30s, 45s
          await sleep(15000 * (attempt + 1));
        } else {
          throw err;
        }
      }
    }

    throw lastError;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
