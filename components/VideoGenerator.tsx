"use client";

import { useState, useCallback } from "react";
import VideoPlayer from "./VideoPlayer";
import ImageUploader from "./ImageUploader";

// Load stitching lib only in browser (uses ffmpeg.wasm)
const stitchVideos = async (urls: string[], onProgress: (p: number) => void) => {
  const { stitchVideos: fn } = await import("@/lib/stitchVideos");
  return fn(urls, onProgress);
};

type ClipStatus = "pending" | "processing" | "done" | "failed";
type Phase = "idle" | "generating" | "stitching" | "done" | "failed";

const DURATION_OPTIONS = [
  { id: "short",  label: "Short",  subLabel: "~10 sec",  clips: 1, seconds: 10 },
  { id: "medium", label: "Medium", subLabel: "~30 sec",  clips: 3, seconds: 30 },
  { id: "long",   label: "Long",   subLabel: "~60 sec",  clips: 6, seconds: 60 },
] as const;

type DurationId = (typeof DURATION_OPTIONS)[number]["id"];

const EXAMPLES = [
  "A serene Japanese garden with cherry blossoms falling gently in golden hour light",
  "A futuristic city skyline at night, neon lights reflecting in rain-soaked streets",
  "An astronaut floating in space with Earth visible in the background, cinematic",
  "A majestic wolf running through a snowy forest, epic slow-motion cinematography",
];

async function pollUntilDone(
  id: string,
  onStatus: (s: ClipStatus) => void
): Promise<string> {
  while (true) {
    const res = await fetch(`/api/status/${id}`);
    const data = await res.json();

    if (data.status === "succeeded") {
      onStatus("done");
      const url = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!url) throw new Error("No output URL returned");
      return url as string;
    }
    if (data.status === "failed" || data.error) {
      onStatus("failed");
      throw new Error(data.error ?? "Clip generation failed");
    }
    onStatus("processing");
    await new Promise((r) => setTimeout(r, 4000));
  }
}

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [duration, setDuration] = useState<DurationId>("short");

  const [phase, setPhase] = useState<Phase>("idle");
  const [clipStatuses, setClipStatuses] = useState<ClipStatus[]>([]);
  const [stitchPct, setStitchPct] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateClipStatus = useCallback((idx: number, status: ClipStatus) => {
    setClipStatuses((prev) => {
      const next = [...prev];
      next[idx] = status;
      return next;
    });
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const opt = DURATION_OPTIONS.find((d) => d.id === duration)!;
    const numClips = opt.clips;

    setPhase("generating");
    setVideoUrl(null);
    setError(null);
    setStitchPct(0);
    setClipStatuses(Array(numClips).fill("pending"));

    try {
      // Start all predictions in parallel
      const startClip = () =>
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            image: images[0] ?? null,  // primary reference image → first_frame_image
            duration: 10,
          }),
        }).then((r) => r.json());

      const predictions = await Promise.all(
        Array.from({ length: numClips }, startClip)
      );

      // Check if any prediction failed to start
      const startError = predictions.find((p) => p.error);
      if (startError) throw new Error(startError.error);

      // Poll all clips in parallel
      const clipUrls = await Promise.all(
        predictions.map((pred, i) =>
          pollUntilDone(pred.id, (s) => updateClipStatus(i, s))
        )
      );

      if (numClips === 1) {
        setVideoUrl(clipUrls[0]);
        setPhase("done");
        return;
      }

      // Stitch multiple clips with ffmpeg.wasm
      setPhase("stitching");
      const merged = await stitchVideos(clipUrls, setStitchPct);
      setVideoUrl(merged);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("failed");
    }
  };

  const reset = () => {
    setPhase("idle");
    setVideoUrl(null);
    setError(null);
    setClipStatuses([]);
    setStitchPct(0);
  };

  const doneOpt = DURATION_OPTIONS.find((d) => d.id === duration)!;
  const doneClips = clipStatuses.filter((s) => s === "done").length;
  const totalClips = doneOpt.clips;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Reference images */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-300">Reference Images</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500">optional</span>
          {images.length > 0 && (
            <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 font-medium">
              {images.length} image{images.length > 1 ? "s" : ""} added
            </span>
          )}
        </div>
        <ImageUploader images={images} onImagesChange={setImages} maxImages={3} />
      </div>

      {/* Image info banner */}
      {images.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-purple-500/8 border border-purple-500/20 text-sm text-purple-300">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Using <strong>MiniMax Hailuo 2.3</strong> — your first image is set as the video&apos;s opening frame and guides the entire visual style.
          </span>
        </div>
      )}

      {/* Duration selector */}
      <div>
        <p className="text-sm font-medium text-gray-300 mb-2">Video Duration</p>
        <div className="grid grid-cols-3 gap-3">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setDuration(opt.id)}
              disabled={phase === "generating" || phase === "stitching"}
              className={`p-4 rounded-xl border text-center transition-all ${
                duration === opt.id
                  ? "border-purple-500 bg-purple-500/10 text-white"
                  : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="font-semibold text-sm">{opt.label}</div>
              <div className="text-xs mt-0.5 opacity-60">{opt.subLabel}</div>
              {opt.clips > 1 && (
                <div className="text-xs mt-1 opacity-40">{opt.clips} clips</div>
              )}
            </button>
          ))}
        </div>
        {duration !== "short" && (
          <p className="text-xs text-gray-600 mt-2">
            ⚡ {doneOpt.clips} clips generated in parallel — total time similar to a single clip (~3–6 min)
          </p>
        )}
      </div>

      {/* Prompt */}
      <div>
        <p className="text-sm font-medium text-gray-300 mb-2">
          {images.length > 0 ? "Describe the motion or scene" : "Describe your video"}
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5 focus-within:border-purple-500/60 transition-colors">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && phase === "idle" && prompt.trim())
                handleGenerate();
            }}
            placeholder={
              images.length > 0
                ? "e.g. Camera slowly pans right, dramatic cinematic lighting…"
                : "Describe the video you want to create…"
            }
            className="w-full bg-transparent text-white placeholder-gray-600 p-4 min-h-[100px] resize-none outline-none text-base"
            disabled={phase === "generating" || phase === "stitching"}
          />
          <div className="flex items-center justify-between px-4 pb-3 border-t border-white/5">
            <span className="text-xs text-gray-600">{prompt.length}/500</span>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || phase === "generating" || phase === "stitching"}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:from-purple-500 hover:to-blue-500 transition-all"
            >
              {phase === "generating" || phase === "stitching" ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {phase === "stitching" ? "Stitching…" : "Generating…"}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generate Video
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Example prompts */}
      {phase === "idle" && images.length === 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:border-white/20 transition-all text-left"
              >
                {ex.slice(0, 48)}…
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generation progress */}
      {phase === "generating" && (
        <div className="rounded-xl bg-white/3 border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white font-medium text-sm">
              Generating clips — {doneClips}/{totalClips} done
            </p>
            <span className="text-xs text-gray-500">{doneOpt.subLabel} video</span>
          </div>

          {totalClips > 1 ? (
            <div className="grid grid-cols-3 gap-2">
              {clipStatuses.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
                    s === "done"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : s === "processing"
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                      : s === "failed"
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : "border-white/10 bg-white/5 text-gray-500"
                  }`}
                >
                  {s === "done" ? (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : s === "processing" ? (
                    <svg className="w-3.5 h-3.5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-current shrink-0" />
                  )}
                  Clip {i + 1}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 animate-spin" />
              </div>
              <p className="text-gray-500 text-sm">Creating your video… this takes 3–6 minutes</p>
            </div>
          )}
        </div>
      )}

      {/* Stitching progress */}
      {phase === "stitching" && (
        <div className="rounded-xl bg-white/3 border border-white/10 p-5 space-y-3">
          <p className="text-white font-medium text-sm">Stitching {totalClips} clips together…</p>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${stitchPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {stitchPct < 20
              ? "Loading video editor…"
              : stitchPct < 80
              ? "Downloading and processing clips…"
              : "Finalising…"}
          </p>
        </div>
      )}

      {/* Error */}
      {phase === "failed" && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-center space-y-3">
          <p className="text-red-400 font-semibold">Generation Failed</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <button onClick={reset} className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition">
            Try Again
          </button>
        </div>
      )}

      {/* Result */}
      {phase === "done" && videoUrl && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-emerald-400 text-sm font-medium">
              {doneOpt.subLabel} video ready
            </span>
          </div>
          <VideoPlayer url={videoUrl} />
          <div className="flex gap-3 justify-center">
            <a
              href={videoUrl}
              download="ai-video.mp4"
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-blue-500 transition-all"
            >
              Download Video
            </a>
            <button
              onClick={reset}
              className="px-6 py-2.5 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition"
            >
              Generate New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
