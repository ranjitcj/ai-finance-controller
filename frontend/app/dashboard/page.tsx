"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge, type Status } from "@/components/shared/StatusBadge";
import { useReconciliationBatch } from "@/hooks/useReconciliationBatch";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const {
    status,
    exceptions,
    audit,
    summary,
    loading,
    syncing,
    error,
    sync,
  } = useReconciliationBatch();

  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncError(null);
    try {
      const today = todayISO();
      await sync(today, today);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    }
  };

  const openExceptions = exceptions.filter((e) => e.status === "OPEN").slice(0, 5);
  const recentEvents = [...audit]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 6);

  return (
    <>
      <TopBar
        title="Dashboard"
        actions={
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync Razorpay Data"}
          </button>
        }
      />

      <main className="flex-1 space-y-6 p-6">
        {syncError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {syncError} — <button onClick={handleSync} className="underline">Retry</button>
          </div>
        )}
        {error && !syncError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !status && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-gray-600">No data yet — run your first sync.</p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Sync Razorpay Data"}
            </button>
          </div>
        )}

        {(loading || status) && (
          <>
            <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
              <KpiCard label="Total Transactions" value={summary.total} loading={loading} />
              <KpiCard label="Matched" value={summary.matched} loading={loading} />
              <KpiCard label="Review Required" value={summary.reviewRequired} loading={loading} />
              <KpiCard label="No Match" value={summary.noMatch} loading={loading} />
            </div>

            <div className="grid grid-cols-[3fr_2fr] gap-6 max-lg:grid-cols-1">
              <ReconHealthChart summary={summary} loading={loading} />
              <ActivityFeed events={recentEvents} loading={loading} />
            </div>

            <RecentExceptions exceptions={openExceptions} loading={loading} />
          </>
        )}
      </main>
    </>
  );
}

function ReconHealthChart({
  summary,
  loading,
}: {
  summary: { total: number; matched: number; reviewRequired: number; noMatch: number };
  loading: boolean;
}) {
  const total = summary.total || 1;
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Reconciliation Health</h2>
      {loading ? (
        <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
      ) : (
        <div className="space-y-2 text-sm">
          <HealthBar label="MATCHED" pct={pct(summary.matched)} color="bg-emerald-500" />
          <HealthBar label="REVIEW REQUIRED" pct={pct(summary.reviewRequired)} color="bg-amber-500" />
          <HealthBar label="NO MATCH" pct={pct(summary.noMatch)} color="bg-red-500" />
        </div>
      )}
    </div>
  );
}

function HealthBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ActivityFeed({
  events,
  loading,
}: {
  events: { id: string; message: string; createdAt: string }[];
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent Activity</h2>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-200" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-500">No activity yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className="w-14 shrink-0 text-gray-400">
                {new Date(e.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-gray-700">{e.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentExceptions({
  exceptions,
  loading,
}: {
  exceptions: { id: string; transactionId: string; issue: string; severity: string; status: string }[];
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Recent Exceptions</h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-gray-500">
            <th scope="col" className="px-4 py-2">Transaction</th>
            <th scope="col" className="px-4 py-2">Issue</th>
            <th scope="col" className="px-4 py-2">Severity</th>
            <th scope="col" className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading &&
            [0, 1, 2].map((i) => (
              <tr key={i}>
                <td colSpan={4} className="px-4 py-2">
                  <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                </td>
              </tr>
            ))}
          {!loading && exceptions.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                No open exceptions.
              </td>
            </tr>
          )}
          {!loading &&
            exceptions.map((e) => (
              <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{e.transactionId}</td>
                <td className="px-4 py-2">{e.issue}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={e.severity as Status} />
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={e.status as Status} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}