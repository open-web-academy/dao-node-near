"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export interface DaoConsoleConfig {
  daoId: string;
  poolId: string;
  destinationId: string;
  amountNear: string;
}

const KEY = "dao-console:v1";

const DEFAULT: DaoConsoleConfig = {
  daoId: "",
  poolId: "",
  destinationId: "",
  amountNear: "",
};

function read(): DaoConsoleConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<DaoConsoleConfig>;
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
let cached: DaoConsoleConfig | null = null;

function getSnapshot(): DaoConsoleConfig {
  if (cached === null) cached = read();
  return cached;
}

function getServerSnapshot(): DaoConsoleConfig {
  return DEFAULT;
}

function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function notify(): void {
  cached = read();
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) notify();
  });
}

export function useConfig(): [DaoConsoleConfig, (patch: Partial<DaoConsoleConfig>) => void] {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setConfig = useCallback((patch: Partial<DaoConsoleConfig>) => {
    const next = { ...read(), ...patch };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    notify();
  }, []);

  useEffect(() => {
    // Hydrate-on-mount for strict mode: ensure cached matches storage.
    notify();
  }, []);

  return [state, setConfig];
}
