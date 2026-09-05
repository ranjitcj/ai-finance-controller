"use client";

import { useEffect, useState } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge, type Status } from "@/components/shared/StatusBadge";

import {
    getReconciliationResults,
    investigateTransaction,
} from "@/services/api";

import type {
    ReconciliationResult,
    TransactionInvestigationResponse,
} from "@/types/api";

export default function InvestigationPage() {
    const [results, setResults] = useState<ReconciliationResult[]>([]);
    const [investigations, setInvestigations] = useState<
        Record<string, TransactionInvestigationResponse>
    >({});
    const [loading, setLoading] = useState(true);
    const [investigating, setInvestigating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const batchId = localStorage.getItem("reconciliationBatchId");

                if (!batchId) {
                    setError(
                        "No reconciliation batch found. Run a sync from the Dashboard first.",
                    );
                    return;
                }

                const data = await getReconciliationResults(batchId);

                setResults(
                    data.filter(
                        (result) => result.status === "REVIEW_REQUIRED",
                    ),
                );
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load investigation cases.",
                );
            } finally {
                setLoading(false);
            }
        }

        void load();
    }, []);

    async function handleInvestigate(transactionId: string) {
        setInvestigating(transactionId);
        setError(null);

        try {
            const result = await investigateTransaction(transactionId);

            setInvestigations((current) => ({
                ...current,
                [transactionId]: result,
            }));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "AI investigation failed.",
            );
        } finally {
            setInvestigating(null);
        }
    }

    return (
        <>
            <TopBar
                title="AI Investigation"
                actions={
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                        Evidence-driven review
                    </div>
                }
            />

            <main className="flex-1 space-y-6 p-6">
                <div>
                    <p className="text-sm text-gray-500">
                        Investigate ambiguous reconciliation cases using Razorpay
                        financial evidence.
                    </p>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
                    <MetricCard
                        label="Cases requiring review"
                        value={loading ? "—" : results.length}
                    />

                    <MetricCard
                        label="Investigations completed"
                        value={Object.keys(investigations).length}
                    />

                    <MetricCard
                        label="Decision authority"
                        value="Policy"
                    />
                </div>

                {loading && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="h-5 w-64 animate-pulse rounded bg-gray-200" />
                        <div className="mt-4 h-20 animate-pulse rounded bg-gray-100" />
                    </div>
                )}

                {!loading && results.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                        <h2 className="text-base font-semibold text-gray-900">
                            No cases require AI investigation
                        </h2>

                        <p className="mt-2 text-sm text-gray-500">
                            Review-required reconciliation cases will appear here.
                        </p>
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">
                                Investigation Queue
                            </h2>

                            <p className="mt-1 text-xs text-gray-500">
                                AI investigates evidence; the Decision Policy remains
                                authoritative.
                            </p>
                        </div>

                        {results.map((result) => (
                            <InvestigationCard
                                key={result.id}
                                result={result}
                                investigation={investigations[result.transactionId]}
                                investigating={
                                    investigating === result.transactionId
                                }
                                onInvestigate={() =>
                                    handleInvestigate(result.transactionId)
                                }
                            />
                        ))}
                    </section>
                )}
            </main>
        </>
    );
}

function MetricCard({
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

function InvestigationCard({
    result,
    investigation,
    investigating,
    onInvestigate,
}: {
    result: ReconciliationResult;
    investigation?: TransactionInvestigationResponse;
    investigating: boolean;
    onInvestigate: () => void;
}) {
    return (
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-5">
                <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                            <StatusBadge status="REVIEW_REQUIRED" />

                            <span className="text-xs text-gray-400">
                                Requires investigation
                            </span>
                        </div>

                        <div className="mt-4">
                            <div className="text-xs uppercase tracking-wide text-gray-400">
                                Transaction
                            </div>

                            <div className="mt-1 break-all font-mono text-xs text-gray-700">
                                {result.transactionId}
                            </div>
                        </div>

                        <div className="mt-4 flex gap-10">
                            <div>
                                <div className="text-xs text-gray-400">Amount</div>
                                <div className="mt-1 text-lg font-semibold text-gray-900">
                                    ₹{result.amount.toLocaleString("en-IN")}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-gray-400">Currency</div>
                                <div className="mt-1 text-lg font-semibold text-gray-900">
                                    {result.currency}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-gray-400">
                                    Confidence
                                </div>
                                <div className="mt-1 text-lg font-semibold text-gray-900">
                                    {result.confidence ?? "—"}
                                </div>
                            </div>
                        </div>

                        {result.reason && (
                            <div className="mt-4 rounded-lg bg-gray-50 p-4">
                                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    Investigation trigger
                                </div>

                                <p className="mt-1 text-sm text-gray-600">
                                    {result.reason}
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onInvestigate}
                        disabled={investigating}
                        className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {investigating
                            ? "Investigating..."
                            : investigation
                                ? "Investigate Again"
                                : "Investigate with AI"}
                    </button>
                </div>
            </div>

            {investigation && (
                <InvestigationResult investigation={investigation} />
            )}
        </article>
    );
}

function InvestigationResult({
    investigation,
}: {
    investigation: TransactionInvestigationResponse;
}) {
    const output = investigation.investigation.output;

    return (
        <div className="border-t border-gray-100 bg-gray-50 p-5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                        Investigation Result
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                        AI observations generated from persisted financial evidence.
                    </p>
                </div>

                <StatusBadge
                    status={investigation.investigation.status as Status}
                />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 max-md:grid-cols-1">
                <ResultMetric
                    label="Iterations"
                    value={investigation.investigation.iterations}
                />

                <ResultMetric
                    label="Financial status"
                    value={
                        getFinancialStatus(output) ?? "INCONCLUSIVE"
                    }
                />

                <ResultMetric
                    label="Policy status"
                    value={investigation.reconciliation.status}
                />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        AI Summary
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-gray-700">
                        {getSummary(output)}
                    </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Evidence
                    </h4>

                    <div className="mt-3 space-y-2">
                        {getEvidence(output).map((item, index) => (
                            <div
                                key={`${item.label}-${index}`}
                                className="flex items-center gap-3 text-sm"
                            >
                                <span
                                    className={
                                        item.pass
                                            ? "font-semibold text-emerald-600"
                                            : "font-semibold text-red-600"
                                    }
                                >
                                    {item.pass ? "✓" : "✕"}
                                </span>

                                <span className="text-gray-700">
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-xs font-semibold text-amber-800">
                    Decision Policy remains authoritative
                </div>

                <p className="mt-1 text-xs text-amber-700">
                    AI investigation does not directly change the financial
                    reconciliation decision.
                </p>
            </div>
        </div>
    );
}

function ResultMetric({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-400">{label}</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
                {value}
            </div>
        </div>
    );
}

function getSummary(output: unknown): string {
    if (
        typeof output === "object" &&
        output !== null &&
        "summary" in output &&
        typeof output.summary === "string"
    ) {
        return output.summary;
    }

    return "Investigation completed. Review the generated evidence below.";
}

function getFinancialStatus(output: unknown): string | null {
    if (
        typeof output === "object" &&
        output !== null &&
        "financialStatus" in output &&
        typeof output.financialStatus === "string"
    ) {
        return output.financialStatus;
    }

    return null;
}

function getEvidence(
    output: unknown,
): { label: string; pass: boolean }[] {
    if (
        typeof output === "object" &&
        output !== null &&
        "evidence" in output &&
        Array.isArray(output.evidence)
    ) {
        return output.evidence.filter(
            (
                item,
            ): item is { label: string; pass: boolean } =>
                typeof item === "object" &&
                item !== null &&
                "label" in item &&
                "pass" in item &&
                typeof item.label === "string" &&
                typeof item.pass === "boolean",
        );
    }

    return [];
}