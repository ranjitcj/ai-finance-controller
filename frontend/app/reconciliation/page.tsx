"use client";

import { useMemo, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge, type Status } from "@/components/shared/StatusBadge";
import { ConfidenceBar } from "@/components/shared/ConfidenceBar";
import { useReconciliationBatch } from "@/hooks/useReconciliationBatch";
import type { ReconciliationResult, ResultStatus } from "@/types/api";

const STATUS_FILTERS: { label: string; value: ResultStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Matched", value: "MATCHED" },
  { label: "Review Required", value: "REVIEW_REQUIRED" },
  { label: "No Match", value: "NO_MATCH" },
];

export default function ReconciliationPage() {
  const { batchId, status, results, summary, loading, error } = useReconciliationBatch();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResultStatus | "ALL">("ALL");
  const [selected, setSelected] = useState<ReconciliationResult | null>(null);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (search && !r.transactionId.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [results, search, statusFilter]);

  return (
    <>
      <TopBar title="Reconciliation" />

      <main className="flex-1 space-y-6 p-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !status && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">
            No reconciliation runs yet — sync from the Dashboard first.
          </div>
        )}

        {(loading || status) && (
          <>
            <BatchSummary batchId={batchId} status={status} loading={loading} />
            <StatRow summary={summary} loading={loading} />

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search transaction ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                aria-label="Search transaction ID"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ResultStatus | "ALL")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                aria-label="Filter by status"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <ResultsTable
              results={filtered}
              loading={loading}
              onSelect={setSelected}
            />
          </>
        )}
      </main>

      {/* Placeholder detail panel — swap for the shared TransactionDrawer once built */}
      {selected && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close transaction details"
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-40 cursor-default bg-black/20"
          />

          {/* Drawer */}
          <aside
            role="dialog"
            aria-label="Transaction detail"
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-gray-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Transaction
                </p>

                <h2
                  className="mt-1 truncate font-mono text-sm font-semibold text-gray-900"
                  title={selected.transactionId}
                >
                  {selected.transactionId}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 p-6">

                {/* Status */}
                <section>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                        Decision status
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Deterministic reconciliation result
                      </p>
                    </div>

                    <StatusBadge status={selected.status as Status} />
                  </div>
                </section>

                {/* Source transaction */}
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Source transaction
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <DetailItem
                      label="Amount"
                      value={`₹${selected.amount.toLocaleString("en-IN")}`}
                    />

                    <DetailItem
                      label="Currency"
                      value="INR"
                    />

                    <div className="col-span-2">
                      <DetailItem
                        label="Transaction ID"
                        value={selected.transactionId}
                        mono
                      />
                    </div>
                  </div>
                </section>

                {/* Candidate */}
                <section>
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Razorpay candidate
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Candidate identified during reconciliation
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white">
                    {selected.candidate?.paymentId ? (
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-400">
                              Payment ID
                            </p>
                            <p
                              className="mt-1 break-all font-mono text-sm font-medium text-gray-900"
                            >
                              {selected.candidate.paymentId}
                            </p>
                          </div>

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            Razorpay
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <p className="text-sm font-medium text-gray-700">
                          No candidate found
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          No Razorpay payment candidate is currently attached
                          to this reconciliation result.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Confidence */}
                <section>
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Deterministic confidence
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Evidence score produced by reconciliation rules
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <ConfidenceBar value={selected.confidence} />
                  </div>
                </section>

                {/* Evidence */}
                <section>
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Reconciliation evidence
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Financial decision remains controlled by policy.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <EvidenceRow
                      label="Amount"
                      value={`₹${selected.amount.toLocaleString("en-IN")}`}
                    />

                    <EvidenceRow
                      label="Currency"
                      value="INR"
                    />

                    <EvidenceRow
                      label="Candidate"
                      value={
                        selected.candidate?.paymentId
                          ? "Payment identified"
                          : "No candidate"
                      }
                    />

                    <EvidenceRow
                      label="Policy decision"
                      value={formatStatus(selected.status)}
                    />
                  </div>
                </section>

                {/* Decision block */}
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Decision policy
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Final decision
                    </span>

                    <StatusBadge status={selected.status} />
                  </div>

                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    The deterministic Decision Policy is authoritative.
                    AI investigation can provide additional evidence but does
                    not directly change the financial reconciliation decision.
                  </p>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function BatchSummary({
  batchId,
  status,
  loading,
}: {
  batchId: string | null;
  status: { status: string; createdAt: string } | null;
  loading: boolean;
}) {
  const copyBatchId = () => {
    if (batchId) navigator.clipboard.writeText(batchId);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {loading ? (
        <div className="h-5 w-64 animate-pulse rounded bg-gray-200" />
      ) : (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-mono text-gray-700">
            Batch: {batchId?.slice(0, 12)}…
            <button
              onClick={copyBatchId}
              aria-label="Copy batch ID"
              className="ml-1 text-gray-400 hover:text-gray-600"
            >
              ⧉
            </button>
          </span>
          <span className="text-gray-500">
            {status && new Date(status.createdAt).toLocaleString()}
          </span>
          {status && <StatusBadge status={status.status as Status} />}
        </div>
      )}
    </div>
  );
}

function StatRow({
  summary,
  loading,
}: {
  summary: { total: number; matched: number; reviewRequired: number; noMatch: number };
  loading: boolean;
}) {
  const stats = [
    { label: "Transactions", value: summary.total },
    { label: "Matched", value: summary.matched },
    { label: "Review Required", value: summary.reviewRequired },
    { label: "No Match", value: summary.noMatch },
  ];

  return (
    <div className="flex flex-wrap gap-6 text-sm">
      {stats.map((s) => (
        <div key={s.label}>
          <span className="text-gray-500">{s.label}: </span>
          {loading ? (
            <span className="inline-block h-4 w-6 animate-pulse rounded bg-gray-200 align-middle" />
          ) : (
            <span className="font-semibold text-gray-900">{s.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ResultsTable({
  results,
  loading,
  onSelect,
}: {
  results: ReconciliationResult[];
  loading: boolean;
  onSelect: (r: ReconciliationResult) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-gray-500">
            <th scope="col" className="px-4 py-2">Transaction</th>
            <th scope="col" className="px-4 py-2">Amount</th>
            <th scope="col" className="px-4 py-2">Candidate</th>
            <th scope="col" className="px-4 py-2">Status</th>
            <th scope="col" className="px-4 py-2">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {loading &&
            [0, 1, 2, 3].map((i) => (
              <tr key={i}>
                <td colSpan={5} className="px-4 py-2">
                  <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                </td>
              </tr>
            ))}

          {!loading && results.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                No transactions match this filter.
              </td>
            </tr>
          )}

          {!loading &&
            results.map((r) => (
              <tr
                key={r.id}
                tabIndex={0}
                onClick={() => onSelect(r)}
                onKeyDown={(e) => e.key === "Enter" && onSelect(r)}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 focus:bg-gray-50"
              >
                <td className="px-4 py-2 font-mono text-xs">{r.transactionId}</td>
                <td className="px-4 py-2">
                  ₹{r.amount.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">
                  {r.candidate?.paymentId ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2">
                  <ConfidenceBar value={r.confidence} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p
        className={`mt-1 text-sm font-medium text-gray-900 ${mono ? "break-all font-mono text-xs" : ""
          }`}
      >
        {value}
      </p>
    </div>
  );
}

function EvidenceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function formatStatus(status: ResultStatus) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}