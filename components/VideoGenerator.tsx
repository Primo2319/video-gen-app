"use client";

import { useState, useCallback } from "react";
import VideoPlayer from "./VideoPlayer";

type Status = "idle" | "creating" | "processing" | "succeeded" | "failed";

const MODELS = [
  { id: "minimax", name: "MiniMax Video-01", description: "High quality · Cinematic" },
  { id: "wan", name: "WAN 2.1 (480p)", description: "Fast · Good quality" },
];

const EXAMPLES = [
  "A serene Japanese garden with cherry blossoms falling gently in the wind, golden hour lighting",
  "A futuristic city skyline at night with neon lights reflecting in rain-soaked streets",
  "An astronaut floating in space, Earth visible in the background, cinematic slow motion",
  "A majestic wolf running through a snowy forest, epic cinematic photography",
];

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("minimax");
  const [status, setStatus] = useState<Status>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [predictionId, setPredictionId] = useState<string | null>(null);

  const pollStatus = useCallback((id: string) => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/status/${id}`);
        const data = await res.json();

        if (data.status === "succeeded") {
          const url = Array.isArray(data.output) ? data.output[0] : data.output;
          setVideoUrl(url);
          setStatus("succeeded");
        } else if (data.status === "failed" || data.error) {
          setError(data.error ?? "Video generation failed. Please try again.");
          setStatus("failed");
        } else {
          setTimeout(tick, 4000);
        }
      } catch {
        setError("Lost connection while checking status. Please refresh.");
        setStatus("failed");
      }
    };
    tick();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStatus("creating");
    setVideoUrl(null);
    setError(null);
    setPredictionId(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start generation");

      setPredictionId(data.id);
      setStatus("processing");
      pollStatus(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("failed");
    }
  };

  const reset = () => {
    setStatus("idle");
    setVideoUrl(null);
    setError(null);
    setPredictionId(null);
  };

  const isGenerating = status === "creating" || status === "processing";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Model selector */}
      <div className="grid grid-cols-2 gap-3">
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModel(m.id)}
            disabled={isGenerating}
            className={`p-4 rounded-xl border text-left transition-all ${
              model === m.id
                ? "border-purple-500 bg-purple-500/10 text-white"
                : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="font-semibold text-sm">{m.name}</div>
            <div className="text-xs mt-0.5 opacity-60">{m.description}</div>
          </button>
        ))}
      </div>

      {/* Prompt input box */}
      <div className="rounded-xl border border-white/10 bg-white/5 focus-within:border-purple-500/60 transition-colors">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isGenerating && prompt.trim()) {
              handleGenerate();
            }
          }}
          placeholder="Describe the video you want to create…"
          className="w-full bg-transparent text-white placeholder-gray-600 p-4 min-h-[110px] resize-none outline-none text-base"
          disabled={isGenerating}
        />
        <div className="flex items-center justify-between px-4 pb-3 border-t border-white/5">
          <span className="text-xs text-gray-600">{prompt.length}/500</span>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:from-purple-500 hover:to-blue-500 transition-all"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
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

      {/* Example prompts */}
      {status === "idle" && (
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

      {/* Processing state */}
      {isGenerating && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">
              {status === "creating" ? "Starting generation…" : "Creating your video…"}
            </p>
            <p className="text-gray-500 text-sm mt-1">This typically takes 2–5 minutes</p>
            {predictionId && (
              <p className="text-gray-700 text-xs mt-2 font-mono">ID: {predictionId}</p>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "failed" && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-center space-y-3">
          <p className="text-red-400 font-semibold">Generation Failed</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Success state */}
      {status === "succeeded" && videoUrl && (
        <div className="space-y-4">
          <VideoPlayer url={videoUrl} />
          <div className="flex gap-3 justify-center">
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
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
