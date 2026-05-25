import { NextRequest, NextResponse } from "next/server";

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
  } catch {}
  return null;
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function imageUrlToDataUri(imgUrl: string): Promise<string> {
  const res = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const contentType = res.headers.get("Content-Type") ?? "image/jpeg";
  const buf = await res.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  return `data:${contentType};base64,${b64}`;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // YouTube — use thumbnail API directly (no auth needed)
    const ytId = youtubeId(url);
    if (ytId) {
      // Try maxresdefault, fall back to hqdefault
      for (const quality of ["maxresdefault", "hqdefault"]) {
        const thumbUrl = `https://img.youtube.com/vi/${ytId}/${quality}.jpg`;
        try {
          const dataUri = await imageUrlToDataUri(thumbUrl);
          return NextResponse.json({ dataUri });
        } catch {}
      }
      return NextResponse.json({ error: "Could not fetch YouTube thumbnail" }, { status: 502 });
    }

    // Instagram / TikTok / Facebook / other — try og:image
    const ogUrl = await fetchOgImage(url);
    if (!ogUrl) {
      return NextResponse.json(
        {
          error:
            "Could not extract a preview image from this URL. Try pasting a direct image URL or uploading a screenshot instead.",
        },
        { status: 422 }
      );
    }

    const dataUri = await imageUrlToDataUri(ogUrl);
    return NextResponse.json({ dataUri });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Thumbnail fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
