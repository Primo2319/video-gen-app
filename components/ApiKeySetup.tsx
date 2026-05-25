"use client";

import { useState } from "react";
import { useApiKey } from "@/hooks/useApiKey";

export default function ApiKeySetup() {
  const { apiKeys, setApiKeys } = useApiKey();
  const [draft, setDraft] = useState("");
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(apiKeys.length === 0);

  const add = () => {
    const key = draft.trim();
    if (!key || apiKeys.includes(key)) return;
    const next = [...apiKeys, key];
    setApiKeys(next);
    setDraft("");
    setExpanded(false);
  };

  const remove = (idx: number) => {
    setApiKeys(apiKeys.filter((_, i) => i !== idx));
  };

  if (apiKeys.length > 0 && !expanded) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-emerald-400 text-sm flex-1">
          {apiKeys.length} Replicate key{apiKeys.length > 1 ? "s" : ""} active
          {apiKeys.length > 1 && (
            <span className="ml-1.5 text-emerald-600 text-xs">— auto-rotates on credit exhaustion</span>
          )}
        </span>
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-gray-500 hover:text-white transition"
        >
          Manage
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-amber-500/8 border border-amber-500/25 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <div>
            <p className="text-amber-300 text-sm font-medium">
              {apiKeys.length === 0 ? "Add your Replicate API key" : "Manage API keys"}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              Free keys at{" "}
              <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                replicate.com/account/api-tokens
              </a>
              {" "}· Add multiple keys from different accounts to get more free credits — app auto-rotates when one runs out.
            </p>
          </div>
        </div>
        {apiKeys.length > 0 && (
          <button onClick={() => setExpanded(false)} className="text-gray-500 hover:text-white mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Existing keys */}
      {apiKeys.length > 0 && (
        <div className="space-y-1.5">
          {apiKeys.map((k, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-xs text-gray-500 w-5 shrink-0">#{i + 1}</span>
              <span className="flex-1 text-xs text-gray-300 font-mono truncate">
                {visible ? k : `${k.slice(0, 5)}${"•".repeat(16)}${k.slice(-4)}`}
              </span>
              {i === 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                  active
                </span>
              )}
              {i > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  fallback
                </span>
              )}
              <button onClick={() => remove(i)} className="text-gray-600 hover:text-red-400 transition shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={() => setVisible((v) => !v)}
            className="text-[11px] text-gray-600 hover:text-gray-400 transition"
          >
            {visible ? "Hide keys" : "Show keys"}
          </button>
        </div>
      )}

      {/* Add new key */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? "text" : "password"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && draft.trim() && add()}
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
          onClick={add}
          disabled={!draft.trim()}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
        >
          {apiKeys.length === 0 ? "Save Key" : "Add Key"}
        </button>
      </div>

      {apiKeys.length === 0 && (
        <div className="rounded-lg bg-white/3 border border-white/8 p-3 space-y-1">
          <p className="text-xs text-gray-400 font-medium">How to get unlimited free credits:</p>
          <ol className="text-xs text-gray-500 space-y-0.5 list-decimal list-inside">
            <li>Go to <a href="https://replicate.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">replicate.com</a> → create a free account</li>
            <li>Copy your API token from <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">account/api-tokens</a></li>
            <li>Paste it above · repeat with multiple accounts for more credits</li>
          </ol>
        </div>
      )}
    </div>
  );
}
