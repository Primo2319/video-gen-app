import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

// wavespeedai/wan-2.1-i2v-480p: image + prompt → video (~5s, free-tier friendly)
// wavespeedai/wan-2.1-t2v-720p: prompt only → video (~5s, 720p, free-tier friendly)
const I2V_MODEL = "wavespeedai/wan-2.1-i2v-480p";
const T2V_MODEL = "wavespeedai/wan-2.1-t2v-720p";

export async function POST(request: NextRequest) {
  try {
    const { prompt, image } = await request.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is not configured on the server." },
        { status: 500 }
      );
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const usingImage = Boolean(image);
    const modelId = usingImage ? I2V_MODEL : T2V_MODEL;

    const input: Record<string, unknown> = {
      prompt: prompt.trim(),
      negative_prompt: "blurry, low quality, distorted, watermark",
      aspect_ratio: "16:9",
      fast_mode: "Balanced",
    };

    // wavespeedai/wan-2.1-i2v-480p uses "image" as the reference frame parameter
    if (usingImage) input.image = image;

    const prediction = await replicate.predictions.create({ model: modelId, input });

    return NextResponse.json({ id: prediction.id, status: prediction.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
