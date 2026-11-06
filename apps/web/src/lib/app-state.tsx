"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getItemStates,
  lastDoneFromAnswer,
  todayIn,
  type AppMode,
  type ItemKind,
  type LastDoneAnswer,
  type BeardVariant,
  type Gender,
  type ItemSettings,
  type ItemState,
  type LocalDate,
  qurbaniWindow,
} from "@hygge/core";
import {
  getStore,
  type AppData,
  type NewLog,
  type Profile,
  type Store,
  type ThemeMode,
} from "./store";
import * as ops from "./store/ops";

export interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

export interface OnboardingInput {
  mode: AppMode;
  gender: Gender;
  beard: BeardVariant;
  /** Answers to "When did you last…?" by item kind. Missing or "unknown" = no log. */
  last: Partial<Record<ItemKind, LastDoneAnswer>>;
  reminderHour: number;
  discreet: boolean;
  preferredWeekday: number | null;
  plansQurbani: boolean;
  timezone: string;
}

interface AppContext {
  ready: boolean;
  error: string | null;
  storeKind: Store["kind"];
  data: AppData;
  today: LocalDate;
  states: ItemState[];
  resolvedTheme: "day" | "night";
  toast: Toast | null;
  dismissToast: () => void;
  saveProfile: (patch: Partial<Profile>) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  applyGender: (gender: Gender, beard: BeardVariant) => Promise<void>;
  updateItem: (id: string, patch: Partial<Omit<ItemSettings, "id" | "kind">>) => Promise<void>;
  /** Logs items as done and shows an undo toast. */
  logDone: (logs: NewLog[], label: string) => Promise<void>;
  /** Used by onboarding: logs without a toast. */
  logQuiet: (logs: NewLog[]) => Promise<void>;
  snooze: (itemId: string, label: string) => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  deleteEverything: () => Promise<void>;
  reload: () => Promise<void>;
}

const Ctx = createContext<AppContext | null>(null);

export function useApp(): AppContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

function systemTheme(): "day" | "night" {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "night"
    : "day";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const store = useMemo(() => getStore(), []);
  const [data, setData] = useState<AppData>(() => ops.emptyData());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [sysTheme, setSysTheme] = useState<"day" | "night">("day");
  const [now, setNow] = useState(() => new Date());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);

  const reload = useCallback(async () => {
    try {
      setData(await store.load());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setReady(true);
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Follow the system theme, and roll "today" over at midnight / when the tab wakes up.
  useEffect(() => {
    setSysTheme(systemTheme());
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onTheme = () => setSysTheme(systemTheme());
    mq?.addEventListener?.("change", onTheme);
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      mq?.removeEventListener?.("change", onTheme);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const resolvedTheme = data.profile.themeMode === "system" ? sysTheme : data.profile.themeMode;

  // Apply the theme to <html>.
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.family = data.profile.gender ?? "neutral";
    el.dataset.theme = resolvedTheme;
  }, [data.profile.gender, resolvedTheme]);

  const today = useMemo(() => todayIn(data.profile.timezone, now), [data.profile.timezone, now]);

  const states = useMemo(() => {
    const p = data.profile;
    const qurbani =
      p.mode === "islamic" && p.plansQurbani
        ? qurbaniWindow(today, p.hijriOffset, p.qurbaniDay)
        : null;
    const pauses = data.pauses.filter((x) => p.mode === "islamic" || x.kind !== "ihram");
    return getItemStates(data.items, data.logs, today, { pauses, qurbani });
  }, [data, today]);

  const showToast = useCallback((text: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastId.current += 1;
    setToast({ id: toastId.current, text, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const guard = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (e) {
        await reload(); // fall back to what is really stored
        showToast(e instanceof Error ? e.message : "That didn't save. Please try again.");
      }
    },
    [reload, showToast],
  );

  const saveProfile = useCallback(
    (patch: Partial<Profile>) =>
      guard(async () => {
        setData((d) => ({ ...d, profile: { ...d.profile, ...patch } })); // optimistic
        await store.saveProfile(patch);
      }),
    [guard, store],
  );

  const applyGender = useCallback(
    (gender: Gender, beard: BeardVariant) =>
      guard(async () => {
        await store.applyGender(gender, beard);
        setData(await store.load());
      }),
    [guard, store],
  );

  const updateItem = useCallback<AppContext["updateItem"]>(
    (id, patch) =>
      guard(async () => {
        setData((d) => ops.updateItem(d, id, patch));
        await store.updateItem(id, patch);
      }),
    [guard, store],
  );

  const logQuiet = useCallback(
    (logs: NewLog[]) =>
      guard(async () => {
        await store.addLogs(logs);
        setData(await store.load());
      }),
    [guard, store],
  );

  const logDone = useCallback(
    (logs: NewLog[], label: string) =>
      guard(async () => {
        const rows = await store.addLogs(logs);
        setData(await store.load());
        const ids = rows.map((r) => r.id);
        showToast(label, () => {
          void guard(async () => {
            await store.removeLogs(ids);
            setData(await store.load());
            setToast(null);
          });
        });
      }),
    [guard, showToast, store],
  );

  const snooze = useCallback(
    (itemId: string, label: string) =>
      guard(async () => {
        const until = ops.addOneDay(today);
        await store.updateItem(itemId, { snoozedUntil: until });
        setData((d) => ops.updateItem(d, itemId, { snoozedUntil: until }));
        showToast(label);
      }),
    [guard, showToast, store, today],
  );

  const completeOnboarding = useCallback(
    (input: OnboardingInput) =>
      guard(async () => {
        await store.applyGender(input.gender, input.beard);
        const loaded = await store.load();
        const day = todayIn(input.timezone);
        const logs: NewLog[] = [];
        for (const item of loaded.items) {
          const answer = input.last[item.kind];
          if (!item.enabled || !answer) continue;
          const doneOn = lastDoneFromAnswer(answer, day);
          if (doneOn) logs.push({ itemId: item.id, doneOn });
        }
        if (logs.length) await store.addLogs(logs);
        await store.saveProfile({
          mode: input.mode,
          timezone: input.timezone,
          reminderHour: input.reminderHour,
          discreet: input.discreet,
          preferredWeekday: input.preferredWeekday,
          plansQurbani: input.plansQurbani,
          onboarded: true,
        });
        setData(await store.load());
      }),
    [guard, store],
  );

  const deleteEverything = useCallback(async () => {
    await store.deleteEverything();
    setData(ops.emptyData(data.profile.timezone));
    await reload();
  }, [data.profile.timezone, reload, store]);

  const value: AppContext = {
    ready,
    error,
    storeKind: store.kind,
    data,
    today,
    states,
    resolvedTheme,
    toast,
    dismissToast,
    saveProfile,
    setThemeMode: (mode) => saveProfile({ themeMode: mode }),
    applyGender,
    updateItem,
    logDone,
    logQuiet,
    snooze,
    completeOnboarding,
    deleteEverything,
    reload,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
