"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateBr, formatLongDate, toLocal } from "@/lib/timezone";
import { cn } from "@/lib/utils";

type Result = { employeeName: string; type: "ENTRY" | "EXIT"; date: string; time: string; message: string };
type View = { kind: "idle" } | { kind: "sending" } | { kind: "done"; result: Result } | { kind: "error"; message: string };

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const IDLE_CLEAR_MS = 15_000;
const RESULT_MS = 4_000;
const ERROR_MS = 3_000;
const RADIUS = 150;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const key = "h-16 rounded-2xl border border-white/10 bg-white/10 text-2xl font-semibold transition hover:bg-white/20 active:scale-95 disabled:opacity-40 sm:h-20 sm:text-3xl";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 8v5M12 17h.01" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const BackspaceIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
    <path d="M17 9l-5 6M12 9l5 6" />
  </svg>
);

function ClockRing({ seconds }: { seconds: number }) {
  return (
    <svg viewBox="0 0 340 340" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
      <circle cx="170" cy="170" r={RADIUS} className="fill-none stroke-white/10" strokeWidth="10" />
      <circle
        cx="170"
        cy="170"
        r={RADIUS}
        className={cn("fill-none stroke-teal-400", seconds !== 0 && "transition-[stroke-dashoffset] duration-1000 ease-linear")}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - seconds / 60)}
      />
    </svg>
  );
}

function Countdown({ ms, className }: { ms: number; className: string }) {
  return (
    <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10">
      <div className={cn("h-full animate-shrink motion-reduce:animate-none", className)} style={{ animationDuration: `${ms}ms` }} />
    </div>
  );
}

export function Terminal({ company, pinLength, requireCode }: { company: string; pinLength: number; requireCode: boolean }) {
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [view, setView] = useState<View>({ kind: "idle" });
  const [now, setNow] = useState<Date | null>(null);
  const offset = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const syncClock = useCallback(async () => {
    try {
      const sent = Date.now();
      const res = await fetch("/api/kiosk/time", { cache: "no-store" });
      const { now: server } = (await res.json()) as { now: number };
      offset.current = server - (sent + Date.now()) / 2;
    } catch {}
  }, []);

  useEffect(() => {
    void syncClock();
    const sync = setInterval(syncClock, 300_000);
    const tick = setInterval(() => setNow(new Date(Date.now() + offset.current)), 1000);
    setNow(new Date(Date.now() + offset.current));
    return () => {
      clearInterval(sync);
      clearInterval(tick);
    };
  }, [syncClock]);

  const reset = useCallback(() => {
    setPin("");
    setCode("");
    setView({ kind: "idle" });
  }, []);

  const armIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setPin(""), IDLE_CLEAR_MS);
  }, []);

  const submit = useCallback(async () => {
    if (pin.length !== pinLength || (requireCode && !code.trim())) return;
    const payload = JSON.stringify(requireCode ? { pin, employeeCode: code.trim() } : { pin });
    setPin("");
    setView({ kind: "sending" });
    try {
      const res = await fetch("/api/kiosk/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        cache: "no-store",
      });
      const data = await res.json();
      setView(
        res.ok && data.success
          ? { kind: "done", result: data }
          : { kind: "error", message: data.message ?? "Não foi possível registrar o ponto. Tente novamente." },
      );
    } catch {
      setView({ kind: "error", message: "Não foi possível registrar o ponto. Tente novamente." });
    }
  }, [pin, pinLength, requireCode, code]);

  useEffect(() => {
    if (view.kind !== "done" && view.kind !== "error") return;
    const timer = setTimeout(reset, view.kind === "done" ? RESULT_MS : ERROR_MS);
    return () => clearTimeout(timer);
  }, [view, reset]);

  const press = useCallback(
    (k: string) => {
      if (view.kind !== "idle") return;
      armIdle();
      if (k === "back") setPin((p) => p.slice(0, -1));
      else if (k === "ok") void submit();
      else setPin((p) => (p.length < pinLength ? p + k : p));
    },
    [view.kind, armIdle, submit, pinLength],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Enter") press("ok");
      else if (e.key === "Escape") setPin("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  const local = now ? toLocal(now) : null;
  const [hh, mm, ss] = local ? local.time.split(":") : ["--", "--", "--"];
  const sending = view.kind === "sending";

  return (
    <main className="kiosk-bg flex min-h-screen select-none flex-col text-white">
      <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
        <span className="text-lg font-semibold">{company}</span>
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-teal-300">Controle de ponto</span>
      </header>

      <div className="grid flex-1 items-center gap-10 p-6 lg:grid-cols-2 lg:gap-16 lg:px-16">
        <section className="flex flex-col items-center gap-8">
          <p className="flex items-center gap-2 text-lg text-slate-300">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
            <span className="first-letter:uppercase">{now ? formatLongDate(now) : ""}</span>
          </p>
          <div className="relative aspect-square w-64 sm:w-80 lg:w-[24rem]">
            <ClockRing seconds={Number(ss) || 0} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="flex items-start gap-1 font-bold tabular-nums">
                <span className="text-6xl sm:text-7xl">{hh}:{mm}</span>
                <span className="mt-1 text-2xl text-amber-400 sm:text-3xl">{ss}</span>
              </p>
              <p className="mt-2 text-sm text-slate-400">{local ? formatDateBr(local.date) : ""}</p>
            </div>
          </div>
        </section>

        <section className="glass mx-auto w-full max-w-md p-6 sm:p-8">
          {view.kind === "done" ? (
            <div role="status" className="animate-pop text-center motion-reduce:animate-none">
              <div
                className={cn(
                  "mx-auto grid h-20 w-20 place-items-center rounded-full",
                  view.result.type === "ENTRY" ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300",
                )}
              >
                <CheckIcon />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-slate-300">
                {view.result.type === "ENTRY" ? "Entrada registrada" : "Saída registrada"}
              </p>
              <p className="mt-2 text-3xl font-bold">{view.result.employeeName}</p>
              <p className="mt-3 text-5xl font-bold tabular-nums">{view.result.time}</p>
              <p className="mt-1 text-slate-300">{view.result.date}</p>
              <p className="mt-4 text-slate-200">{view.result.message}</p>
              <p className="text-lg font-medium">{view.result.type === "ENTRY" ? "Bom trabalho!" : "Até amanhã!"}</p>
              <Countdown ms={RESULT_MS} className={view.result.type === "ENTRY" ? "bg-emerald-400" : "bg-sky-400"} />
            </div>
          ) : view.kind === "error" ? (
            <div role="alert" className="animate-shake text-center motion-reduce:animate-none">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-red-500/20 text-red-300">
                <AlertIcon />
              </div>
              <p className="mt-4 text-xl font-semibold">{view.message}</p>
              <Countdown ms={ERROR_MS} className="bg-red-400" />
            </div>
          ) : (
            <>
              <h2 className="text-center text-xl font-semibold">{requireCode ? "Informe matrícula e PIN" : "Informe seu PIN"}</h2>
              {requireCode && (
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Matrícula"
                  autoComplete="off"
                  maxLength={32}
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-xl placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
                />
              )}
              <div className="mt-6 flex items-center rounded-2xl bg-black/25 px-4 py-4">
                <div className="flex flex-1 justify-center gap-3" aria-label="PIN">
                  {Array.from({ length: pinLength }, (_, i) => (
                    <span
                      key={i}
                      className={cn("h-4 w-4 rounded-full border-2 transition", i < pin.length ? "border-teal-300 bg-teal-300" : "border-slate-500")}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Apagar"
                  disabled={sending || pin.length === 0}
                  onClick={() => press("back")}
                  className="rounded-lg p-1 text-slate-300 transition hover:text-white disabled:opacity-30"
                >
                  <BackspaceIcon />
                </button>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {DIGITS.map((d) => (
                  <button key={d} type="button" disabled={sending} onClick={() => press(d)} className={key}>{d}</button>
                ))}
                <button type="button" disabled={sending} onClick={() => press("0")} className={key}>0</button>
                <button
                  type="button"
                  disabled={sending || pin.length !== pinLength}
                  onClick={() => press("ok")}
                  className="col-span-2 h-16 rounded-2xl bg-teal-400 text-xl font-bold text-slate-950 transition hover:bg-teal-300 active:scale-95 disabled:opacity-40 sm:h-20 sm:text-2xl"
                >
                  {sending ? "Registrando…" : "Confirmar"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
