"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "replicate_api_keys";

export function useApiKey() {
  const [apiKeys, setApiKeysState] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      setApiKeysState(Array.isArray(parsed) ? parsed : []);
    } catch {
      setApiKeysState([]);
    }
    setLoaded(true);
  }, []);

  const setApiKeys = (keys: string[]) => {
    const trimmed = keys.map((k) => k.trim()).filter(Boolean);
    if (trimmed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setApiKeysState(trimmed);
  };

  // Convenience: first key only (legacy)
  const apiKey = apiKeys[0] ?? "";

  return { apiKey, apiKeys, setApiKeys, loaded };
}
