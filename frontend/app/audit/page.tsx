"use client";

import { useEffect, useState } from "react";

import { TopBar } from "@/components/layout/TopBar";

import { getReconciliationAudit } from "@/services/api";

import type { AuditEvent } from "@/types/api";

export default function AuditPage() {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const batchId = localStorage.getItem(
                    "reconciliationBatchId",
                );

                if (!batchId) {
                    setError(
                        "No reconciliation batch found. Run a sync from the Dashboard first.",
                    );
                    return;
                }

                const data = await getReconciliationAudit(batchId);

                setEvents(
                    [...data].sort((a, b) =>
                        a.createdAt < b.createdAt ? -1 : 1,
                    ),
                );
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load audit trail.",
                );
            } finally {
                setLoading(false);
            }
        }

        void load();
    }, []);

    return (
        <>
            <TopBar
                title="Audit Trail"
                actions={
                    <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                        Immutable activity
                    </div>
                }
            />

            <main className="flex-1 space-y-6 p-6">
                <div>
                    <p className="text-sm text-gray-500">
                        Trace reconciliation activity, investigations, and financial
                        control events.
                    </p>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {!loading && events.length > 0 && (
                    <AuditSummary events={events} />
                )}

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-900">
                        Activity Timeline
                    </h2>

                    {loading && (
                        <div className="mt-6 space-y-5">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="flex gap-4">
                                    <div className="h-3 w-3 animate-pulse rounded-full bg-gray-200" />
                                    <div className="flex-1">
                                        <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                                        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-gray-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && events.length === 0 && (
                        <div className="mt-6 rounded-lg bg-gray-50 p-8 text-center">
                            <p className="text-sm text-gray-500">
                                No audit events found.
                            </p>
                        </div>
                    )}

                    {!loading && events.length > 0 && (
                        <div className="mt-6">
                            {events.map((event, index) => (
                                <AuditTimelineItem
                                    key={event.id}
                                    event={event}
                                    last={index === events.length - 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}

function AuditSummary({
    events,
}: {
    events: AuditEvent[];
}) {
    const latest = events[events.length - 1];

    return (
        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <SummaryCard
                label="Audit events"
                value={events.length}
            />

            <SummaryCard
                label="Latest activity"
                value={
                    latest
                        ? new Date(latest.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                        : "—"
                }
            />

            <SummaryCard
                label="Traceability"
                value="Enabled"
            />
        </div>
    );
}

function SummaryCard({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="mt-2 text-xl font-semibold text-gray-900">
                {value}
            </div>
        </div>
    );
}

function AuditTimelineItem({
    event,
    last,
}: {
    event: AuditEvent;
    last: boolean;
}) {
    const metadata = parseMetadata(event.metadata);

    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className="mt-1 h-3 w-3 rounded-full bg-gray-900 ring-4 ring-gray-100" />

                {!last && (
                    <div className="mt-2 w-px flex-1 bg-gray-200" />
                )}
            </div>

            <div className={`flex-1 ${last ? "pb-2" : "pb-7"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {formatEventType(event.type)}
                        </div>

                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {event.message}
                        </p>
                    </div>

                    <time className="text-xs text-gray-400">
                        {new Date(event.createdAt).toLocaleString()}
                    </time>
                </div>

                {metadata && (
                    <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50">
                        <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-gray-600">
                            View event details
                        </summary>

                        <pre className="overflow-auto border-t border-gray-200 px-4 py-3 text-xs text-gray-600">
                            {JSON.stringify(metadata, null, 2)}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    );
}

function formatEventType(type: string) {
    return type.replaceAll("_", " ");
}

function parseMetadata(
    metadata: AuditEvent["metadata"],
): Record<string, unknown> | null {
    if (!metadata) return null;

    if (typeof metadata === "object") {
        return metadata;
    }

    try {
        const parsed = JSON.parse(metadata);

        if (
            typeof parsed === "string"
        ) {
            return JSON.parse(parsed);
        }

        return parsed;
    } catch {
        return null;
    }
}