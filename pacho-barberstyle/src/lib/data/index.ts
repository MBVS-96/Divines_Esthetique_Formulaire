import type { DataProvider } from "./provider";
import { createLocalProvider } from "./local";
import { createSupabaseProvider } from "./supabase";

export type { DataProvider } from "./provider";

/**
 * Pick the backend from the environment.
 *
 * With no Supabase credentials the app runs entirely in the browser, which is
 * what makes `npm run dev` work out of the box and lets the barber try the
 * whole flow before any account exists.
 */
let provider: DataProvider | null = null;

export function getProvider(): DataProvider {
  if (provider) return provider;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  provider = url && key ? createSupabaseProvider(url, key) : createLocalProvider();
  return provider;
}

export function isDemoMode(): boolean {
  return getProvider().mode === "local";
}
