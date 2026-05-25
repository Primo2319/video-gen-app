"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

function resizeImage(file: File, maxSize = 768): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const PLATFORM_HINTS: { pattern: RegExp; label: string }[] = [
  { pattern: /youtube\.com|youtu\.be/, label: "YouTube" },
  { pattern: /instagram\.com/, label: "Instagram" },
  { pattern: /tiktok\.com/, label: "TikTok" },
  { pattern: /facebook\.com|fb\.com/, label: "Facebook" },
];

function detectPlatform(url: string): string {
  for (const { pattern, label } of PLATFORM_HINTS) {
    if (pattern.test(url)) return label;
  }
  return "URL";
}

type Tab = "upload" | "url";

export default function ImageUploader({
  images,
  onImagesChange,
  maxImages = 3,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState<Tab>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const slots = maxImages - images.length;
      if (slots <= 0) return;
      const resized = await Promise.all(arr.slice(0, slots).map(resizeImage));
      onImagesChange([...images, ...resized]);
    },
    [images, maxImages, onImagesChange]
  );

  const remove = (idx: number) =>
    onImagesChange(images.filter((_, i) => i !== idx));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const fetchFromUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setUrlError(null);
    setUrlLoading(true);
    try {
      const res = await fetch("/api/fetch-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load image");
      onImagesChange([...images, data.dataUri].slice(0, maxImages));
      setUrlInput("");
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Failed to load image");
    } finally {
      setUrlLoading(false);
    }
  };

  const canAdd = images.length < maxImages;

  return (
    <div className="space-y-3">
      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {images.map((src, i) => (
            <div
              key={i}
              className="relative w-24 h-24 rounded-xl overflow-hidden border border-purple-500/40 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all" />
              <button
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs items-center justify-center hidden group-hover:flex"
              >
                ×
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-600 text-white font-medium">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setTab("upload")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                tab === "upload"
                  ? "bg-white/8 text-white border-b-2 border-purple-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upload Image
            </button>
            <button
              onClick={() => { setTab("url"); setUrlError(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                tab === "url"
                  ? "bg-white/8 text-white border-b-2 border-purple-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Social Media URL
            </button>
          </div>

          {/* Upload tab */}
          {tab === "upload" && (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center gap-2 p-5 cursor-pointer transition-all select-none ${
                dragging
                  ? "bg-purple-500/10"
                  : "bg-white/3 hover:bg-purple-500/5"
              }`}
            >
              <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9H19.5" />
              </svg>
              <div className="text-center">
                <p className="text-sm text-gray-400">
                  {images.length === 0 ? "Drop reference images here" : `Add more (${images.length}/${maxImages})`}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">click to browse · JPG, PNG, WebP</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {/* URL tab */}
          {tab === "url" && (
            <div className="p-4 bg-white/3 space-y-3">
              <p className="text-xs text-gray-500">
                Paste a YouTube, Instagram, TikTok, or Facebook URL — we&apos;ll extract the thumbnail as a reference image.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && !urlLoading && fetchFromUrl()}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={fetchFromUrl}
                  disabled={!urlInput.trim() || urlLoading}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  {urlLoading ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading
                    </>
                  ) : (
                    <>
                      {urlInput.trim() && (
                        <span className="text-[10px] opacity-60">{detectPlatform(urlInput)}</span>
                      )}
                      Add
                    </>
                  )}
                </button>
              </div>
              {urlError && (
                <p className="text-xs text-red-400">{urlError}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {["YouTube", "Instagram", "TikTok", "Facebook"].map((p) => (
                  <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!canAdd && (
        <p className="text-xs text-gray-500 text-center">
          Maximum {maxImages} reference images · hover a thumbnail to remove
        </p>
      )}
    </div>
  );
}
