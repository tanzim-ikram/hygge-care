import { formatHijri, kindsFor, displayName, todayIn } from "@hygge/core";

// Render per request so the date shown is always today.
export const dynamic = "force-dynamic";

export default function Home() {
  const today = todayIn("UTC");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Hygge</h1>
        <p className="mt-2 text-muted">A gentle personal-care tracker. Coming soon 🌿</p>
      </div>
      <p className="text-sm text-muted">
        Today is {today} · {formatHijri(today)}
      </p>
      <ul className="grid grid-cols-2 gap-2 text-sm">
        {kindsFor("male").map((k) => (
          <li key={k} className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
            {displayName(k, "trim")}
          </li>
        ))}
      </ul>
    </main>
  );
}
