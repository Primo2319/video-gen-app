import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

// Both modes use minimax/video-01 — it supports first_frame_image for image-guided generation
const MODEL = "minimax/video-01";

const TEXT_MODELS: Record<string, string> = {
  minimax: "minimax/video-01",
  wan: "wan-ai/wan2.1-t2v-480p",
};

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

    // When an image is provided use minimax/video-01 with first_frame_image.
    // That parameter tells the model to use the image as the visual reference/starting frame.
    const modelId = image ? MODEL : (TEXT_MODELS[model] ?? TEXT_MODELS.minimax);
    const input: Record<string, unknown> = { prompt: prompt.trim() };
    if (image) input.first_frame_image = image;

    const prediction = await replicate.predictions.create({ model: modelId, input });

    return NextResponse.json({ id: prediction.id, status: prediction.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
