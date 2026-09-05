import type { BatchStatus, ResultStatus, ExceptionStatus } from "@/types/api";

export type Status =
  | BatchStatus
  | ResultStatus
  | ExceptionStatus
  | "OPEN"
  | "RESOLVED";

const STYLES: Record<string, string> = {
  MATCHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REVIEW_REQUIRED: "bg-amber-50 text-amber-700 border-amber-200",
  RECONCILING: "bg-amber-50 text-amber-700 border-amber-200",
  SYNCING: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING: "bg-gray-50 text-gray-600 border-gray-200",
  NO_MATCH: "bg-red-50 text-red-700 border-red-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  OPEN: "bg-red-50 text-red-700 border-red-200",
  RESOLVED: "bg-gray-50 text-gray-600 border-gray-200",
};

const LABELS: Record<string, string> = {
  REVIEW_REQUIRED: "REVIEW REQUIRED",
  NO_MATCH: "NO MATCH",
};

export function StatusBadge({ status }: { status: Status }) {
  const style = STYLES[status] ?? "bg-gray-50 text-gray-600 border-gray-200";
  const label = LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}