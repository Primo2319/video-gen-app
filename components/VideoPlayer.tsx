"use client";

export default function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="rounded-xl overflow-hidden bg-black border border-white/10">
      <video
        src={url}
        controls
        autoPlay
        loop
        playsInline
        className="w-full max-h-[520px] object-contain block"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
