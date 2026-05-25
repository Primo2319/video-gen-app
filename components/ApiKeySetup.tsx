"use client";

import { useState } from "react";
import { useApiKey } from "@/hooks/useApiKey";

interface Props {
  onSaved?: () => void;
}

export default function ApiKeySetup({ onSaved }: Props) {
  const { apiKey, setApiKey } = useApiKey();
  const [editing, setEditing] = useState(!apiKey);
  const [draft, setDraft] = useState(apiKey);
  const [visible, setVisible] = useState(false);

  const save = () => {
    setApiKey(draft);
    setEditing(false);
    onSaved?.();
  };

  if (!editing && apiKey) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-emerald-400 text-sm flex-1">Replicate API key set</span>
        <button
          onClick={() => { setDraft(apiKey); setEditing(true); }}
          className="text-xs text-gray-500 hover:text-white transition"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-amber-500/8 border border-amber-500/25 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        <div>
          <p className="text-amber-300 text-sm font-medium">Your Replicate API key required</p>
          <p className="text-gray-400 text-xs mt-0.5">
            Get a free key at{" "}
            <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
              replicate.com/account/api-tokens
            </a>
            {" "}— free tier includes enough credits to generate videos.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? "text" : "password"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && draft.trim() && save()}
            placeholder="r8_xxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-amber-500/50 pr-10"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {visible ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <button
          onClick={save}
          disabled={!draft.trim()}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}
