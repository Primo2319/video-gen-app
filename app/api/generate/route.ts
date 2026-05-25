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

    // Build key pool: user-supplied keys first, env fallback last
    const userKeysHeader = request.headers.get("X-Replicate-Tokens") ?? "";
    const userKeys = userKeysHeader
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const envKey = process.env.REPLICATE_API_TOKEN ?? "";
    const keyPool = envKey ? [...userKeys, envKey] : userKeys;

    if (keyPool.length === 0) {
      return NextResponse.json(
        { error: "No Replicate API key found. Please add your API key in the settings above." },
        { status: 401 }
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

      // Retry up to 4 times on 429 with increasing back-off
      let rateLimited = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const prediction = await replicate.predictions.create({ model: modelId, input });
          // Return which key index (from user-supplied list) was used, so the
          // client can pass the right key when polling status.
          return NextResponse.json({
            id: prediction.id,
            status: prediction.status,
            keyIndex: ki < userKeys.length ? ki : -1,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("402") || msg.toLowerCase().includes("insufficient credit") || msg.toLowerCase().includes("payment required")) {
            // This key has no credits — try next key immediately
            rateLimited = false;
            break;
          }
          if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("throttled")) {
            // Back off: 15s, 30s, 45s then retry same key
            await sleep(15000 * (attempt + 1));
            rateLimited = true;
          } else {
            throw err;
          }
        }
      }
      if (rateLimited) continue; // all retries exhausted on rate limit, try next key
    }

    return NextResponse.json(
      {
        error:
          "All API keys have run out of credits. Add more keys at replicate.com/account/api-tokens (create additional free accounts to get more credits).",
      },
      { status: 402 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
