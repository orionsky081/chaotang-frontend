"use client";

import Link from "next/link";
import useSWR from "swr";
import { API_PATHS, swrFetcher } from "@/lib/api";
import {
  resolveDadianBriefingState,
  selectDadianNextAction,
} from "@/features/dadian/lib/live-briefing";

export default function BottomBar() {
  const { data, error, isLoading, mutate } = useSWR<unknown, Error>(
    API_PATHS.chaotang.studyBriefing,
    swrFetcher<unknown>,
    { revalidateOnFocus: false },
  );
  const state = resolveDadianBriefingState({ data, error, isLoading });
  const action = state.status === "ready" || state.status === "empty"
    ? selectDadianNextAction(state.briefing)
    : state.status === "loading"
      ? { role: "丞相", notice: "正在读取朝堂实况…", href: "/court-briefing", activeStep: -1 as const }
      : { role: "值守", notice: "朝堂实况暂不可用", href: "/status", activeStep: -1 as const };
  const accent = "#F0C66A";

  return (
    <div className="fixed bottom-10 left-1/2 z-[120] w-[calc(100%-24px)] -translate-x-1/2 animate-fade-in overflow-hidden rounded-lg border border-[#d8b76a]/30 bg-[#050912]/90 shadow-[0_18px_54px_rgba(0,0,0,0.42)] backdrop-blur-xl md:absolute md:bottom-3 md:w-[min(1120px,calc(100%-24px))] md:bg-[#050912]/86">
      <div className="grid items-center gap-2 px-3 py-2.5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-3 md:px-4">
        <div className="flex items-center gap-3">
          <div
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-black/24 sm:flex"
            style={{ borderColor: `${accent}55`, color: accent }}
          >
            <ScrollIcon />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#8F835F]">
              Imperial Copilot · 御前副驾驶栏
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="rounded border px-1.5 py-0.5 text-[10px]" style={{ borderColor: `${accent}44`, color: accent }}>
                {action.role}
              </span>
              <span className="truncate text-[12px] text-parchment-100">{action.notice}</span>
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <CopilotStep active={action.activeStep >= 0} label="下旨" />
          <StepLine />
          <CopilotStep active={action.activeStep >= 1} label="拆解" />
          <StepLine />
          <CopilotStep active={action.activeStep >= 2} label="追踪" />
          <StepLine />
          <CopilotStep active={action.activeStep >= 3} label="归档" />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {state.status === "error" ? (
            <button
              type="button"
              onClick={() => void mutate()}
              className="rounded border border-[#F0C66A]/36 bg-[#F0C66A]/10 px-3 py-2 text-[12px] font-medium text-[#F0C66A] transition hover:bg-[#F0C66A]/16"
            >
              重新读取
            </button>
          ) : (
            <Link
              href={action.href}
              className="rounded border border-[#F0C66A]/36 bg-[#F0C66A]/10 px-3 py-2 text-[12px] font-medium text-[#F0C66A] transition hover:bg-[#F0C66A]/16"
            >
              {state.status === "loading" ? "查看上书房" : "继续办理"}
            </Link>
          )}
          <Link
            href="/court-briefing"
            className="hidden rounded border border-white/12 bg-white/[0.035] px-3 py-2 text-[12px] text-parchment-200/76 transition hover:bg-white/[0.07] sm:inline-flex"
          >
            回上书房
          </Link>
        </div>
      </div>
    </div>
  );
}

function CopilotStep({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#3DD68C]" : "bg-white/16"}`} />
      <span className={`text-[11px] ${active ? "text-parchment-100" : "text-parchment-200/38"}`}>{label}</span>
    </div>
  );
}

function StepLine() {
  return <span className="h-px w-8 bg-white/10" />;
}

function ScrollIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
