import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

// minimax/hailuo-2.3: confirmed supports prompt + first_frame_image + duration (6|10)
const MODEL = "minimax/hailuo-2.3";

export async function POST(request: NextRequest) {
  try {
    const { prompt, image, duration = 10 } = await request.json();

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

    const input: Record<string, unknown> = {
      prompt: prompt.trim(),
      duration: duration === 6 ? 6 : 10,
      resolution: "768p",
      prompt_optimizer: true,
    };

    // first_frame_image is confirmed supported by hailuo-2.3
    if (image) input.first_frame_image = image;

    const prediction = await replicate.predictions.create({ model: MODEL, input });

    return NextResponse.json({ id: prediction.id, status: prediction.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
