"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "replicate_api_key";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? "";
    setApiKeyState(stored);
    setLoaded(true);
  }, []);

  const setApiKey = (key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setApiKeyState(trimmed);
  };

  return { apiKey, setApiKey, loaded };
}
