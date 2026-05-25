import VideoGenerator from "@/components/VideoGenerator";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080810]">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-32 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-gray-400 mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Free AI Video Generation
          </span>

          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-5 leading-tight">
            Turn Words Into
            <br />
            <span className="gradient-text">Stunning Videos</span>
          </h1>

          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Describe any scene and our AI will generate a professional video in minutes.
            No design skills needed.
          </p>
        </div>

        {/* Generator */}
        <VideoGenerator />

        {/* Feature row */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-16">
          {[
            { icon: "⚡", title: "Fast Generation", desc: "Results in 2–5 minutes" },
            { icon: "🎬", title: "Cinematic Quality", desc: "Powered by top AI models" },
            { icon: "⬇️", title: "Free Download", desc: "Keep every video you make" },
          ].map((f) => (
            <div
              key={f.title}
              className="text-center p-5 rounded-xl bg-white/3 border border-white/8"
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-white text-sm font-semibold mb-1">{f.title}</div>
              <div className="text-gray-500 text-xs">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-gray-600 text-sm border-t border-white/5">
        Powered by Replicate AI &nbsp;·&nbsp; Deploy free on Vercel
      </footer>
    </main>
  );
}
