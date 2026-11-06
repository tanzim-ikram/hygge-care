import { getSupabase } from "../supabase";
import { CloudStore } from "./cloud";
import { LocalStore } from "./local";
import type { Store } from "./types";

export * from "./types";

let store: Store | null = null;

/** Cloud sync when Supabase keys are set, otherwise browser-only storage. */
export function getStore(): Store {
  if (store) return store;
  const sb = getSupabase();
  store = sb ? new CloudStore(sb) : new LocalStore();
  return store;
}
