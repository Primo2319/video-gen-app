import { NextRequest, NextResponse } from "next/server";

// Proxy video downloads so ffmpeg.wasm can fetch them without CORS issues
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const upstream = await fetch(url);
    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "video/mp4",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Proxy fetch failed";
    return new NextResponse(message, { status: 502 });
  }
}
