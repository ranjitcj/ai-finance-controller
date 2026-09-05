"use client";

import { useEffect, useState } from "react";

import {
    getReconciliationResults,
} from "@/services/api";

import type {
    ReconciliationResult,
} from "@/types/api";

export default function TransactionsPage() {
    const [results, setResults] = useState<
        ReconciliationResult[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const batchId = localStorage.getItem(
            "reconciliationBatchId",
        );

        if (!batchId) {
            setLoading(false);
            return;
        }

        getReconciliationResults(batchId)
            .then(setResults)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load transactions",
                );
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="min-h-screen bg-slate-50 p-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Transactions
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Reconciliation results for the current batch.
                </p>

                {loading && (
                    <div className="mt-8 rounded-lg border bg-white p-6">
                        Loading transactions...
                    </div>
                )}

                {error && (
                    <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
                        {error}
                    </div>
                )}

                {!loading && !error && results.length === 0 && (
                    <div className="mt-8 rounded-lg border bg-white p-6 text-slate-500">
                        No transactions found.
                    </div>
                )}

                {!loading && !error && results.length > 0 && (
                    <div className="mt-8 overflow-hidden rounded-lg border bg-white">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4">
                                        Transaction ID
                                    </th>
                                    <th className="px-6 py-4">
                                        Amount
                                    </th>
                                    <th className="px-6 py-4">
                                        Currency
                                    </th>
                                    <th className="px-6 py-4">
                                        Status
                                    </th>
                                    <th className="px-6 py-4">
                                        Confidence
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {results.map((result) => (
                                    <tr
                                        key={result.id}
                                        className="border-b last:border-b-0"
                                    >
                                        <td className="px-6 py-4 font-mono text-xs">
                                            {result.transactionId}
                                        </td>

                                        <td className="px-6 py-4 font-medium">
                                            {result.amount.toLocaleString(
                                                "en-IN",
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            {result.currency}
                                        </td>

                                        <td className="px-6 py-4">
                                            {result.status}
                                        </td>

                                        <td className="px-6 py-4">
                                            {result.confidence ?? "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}