import clsx from "clsx";
import { CheckCircle2, Loader2, XCircle, Circle } from "lucide-react";
import { formatDuration } from "@/lib/format";

const STEP_LABELS = {
  audio_separation: "Audio separation",
  speaker_diarization: "Speaker diarization",
  speaker_segment_preparation: "Segment preparation",
  speaker_aware_transcription: "Speaker-aware transcription",
  original_subtitle_generation: "Subtitle generation",
};

const STATE_META = {
  pending: { icon: Circle, cls: "text-slate-300 dark:text-slate-700" },
  running: { icon: Loader2, cls: "text-brand-500", spin: true },
  success: { icon: CheckCircle2, cls: "text-emerald-500" },
  failed: { icon: XCircle, cls: "text-red-500" },
  skipped: { icon: Circle, cls: "text-slate-300 dark:text-slate-700" },
};

export default function PipelineSteps({ steps = [] }) {
  return (
    <ol className="space-y-1">
      {steps.map((step, i) => {
        const meta = STATE_META[step.status] || STATE_META.pending;
        const Icon = meta.icon;
        const isLast = i === steps.length - 1;

        return (
          <li
            key={step.stepNumber}
            className="relative flex gap-3 pb-5 last:pb-0"
          >
            {!isLast && (
              <span
                className={clsx(
                  "absolute left-[11px] top-6 h-full w-px",
                  step.status === "success"
                    ? "bg-emerald-300 dark:bg-emerald-800"
                    : "bg-slate-200 dark:bg-slate-800",
                )}
              />
            )}
            <Icon
              className={clsx(
                "mt-0.5 h-[22px] w-[22px] shrink-0",
                meta.cls,
                meta.spin && "animate-spin",
              )}
            />
            <div className="min-w-0 flex-1">
              <p
                className={clsx(
                  "text-sm font-semibold",
                  step.status === "pending" || step.status === "skipped"
                    ? "text-slate-400 dark:text-slate-500"
                    : "text-slate-800 dark:text-slate-100",
                )}
              >
                {STEP_LABELS[step.name] || step.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                {step.status === "running" && <span>In progress…</span>}
                {step.durationSeconds != null && step.status === "success" && (
                  <span>
                    Completed in {formatDuration(step.durationSeconds)}
                  </span>
                )}
                {step.error && (
                  <span className="text-red-500">{step.error}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
