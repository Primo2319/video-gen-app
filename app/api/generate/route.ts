import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const TEXT_MODELS: Record<string, string> = {
  minimax: "minimax/video-01",
  wan: "wan-ai/wan2.1-t2v-480p",
};

const IMAGE_TO_VIDEO_MODEL = "wan-ai/wan2.1-i2v-480p";

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = "minimax", image } = await request.json();

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

    const modelId = image ? IMAGE_TO_VIDEO_MODEL : (TEXT_MODELS[model] ?? TEXT_MODELS.minimax);
    const input: Record<string, unknown> = { prompt: prompt.trim() };
    if (image) input.image = image;

    const prediction = await replicate.predictions.create({ model: modelId, input });

    return NextResponse.json({ id: prediction.id, status: prediction.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
