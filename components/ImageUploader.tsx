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

export default function ImageUploader({
  images,
  onImagesChange,
  maxImages = 3,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

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

      {/* Drop zone — only shown when under limit */}
      {canAdd && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none ${
            dragging
              ? "border-purple-400 bg-purple-500/10"
              : "border-white/15 bg-white/3 hover:border-purple-500/40 hover:bg-purple-500/5"
          }`}
        >
          <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9H19.5" />
          </svg>
          <div className="text-center">
            <p className="text-sm text-gray-400">
              {images.length === 0 ? "Drop reference images here" : `Add more (${images.length}/${maxImages})`}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              click to browse · JPG, PNG, WebP · up to {maxImages}
            </p>
          </div>
          {images.length === 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
              Optional — guides video style &amp; content
            </span>
          )}
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

      {/* Full indicator */}
      {!canAdd && (
        <p className="text-xs text-gray-500 text-center">
          Maximum {maxImages} reference images · hover a thumbnail to remove
        </p>
      )}
    </div>
  );
}
