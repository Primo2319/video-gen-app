import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

function getKeyPool(): string[] {
  const pool: string[] = [];
  if (process.env.REPLICATE_API_TOKEN) pool.push(process.env.REPLICATE_API_TOKEN);
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`REPLICATE_API_TOKEN_${i}`];
    if (k) pool.push(k);
  }
  return pool;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ki tells us which pool key created this prediction
    const kiParam = request.nextUrl.searchParams.get("ki");
    const ki = kiParam !== null ? parseInt(kiParam, 10) : 0;

    const pool = getKeyPool();
    if (pool.length === 0) {
      return NextResponse.json({ error: "API token not configured" }, { status: 500 });
    }

    const token = pool[ki] ?? pool[0];
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
