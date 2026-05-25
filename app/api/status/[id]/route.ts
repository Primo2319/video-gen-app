import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const token =
      request.headers.get("X-Replicate-Token") || process.env.REPLICATE_API_TOKEN;

    if (!token) {
      return NextResponse.json({ error: "API token not configured" }, { status: 500 });
    }

    const replicate = new Replicate({ auth: token });
    const prediction = await replicate.predictions.get(id);

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to check status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
