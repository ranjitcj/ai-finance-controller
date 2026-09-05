"use client";

import { useEffect, useState } from "react";

import {
    getReconciliationExceptions,
} from "@/services/api";

import type {
    ReconciliationException,
} from "@/types/api";

export default function ExceptionsPage() {
    const [exceptions, setExceptions] = useState<
        ReconciliationException[]
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

        getReconciliationExceptions(batchId)
            .then(setExceptions)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load exceptions",
                );
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="min-h-screen bg-slate-50 p-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Exceptions
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Reconciliation exceptions requiring attention.
                </p>

                {loading && (
                    <div className="mt-8 rounded-lg border bg-white p-6">
                        Loading exceptions...
                    </div>
                )}

                {error && (
                    <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
                        {error}
                    </div>
                )}

                {!loading && !error && exceptions.length === 0 && (
                    <div className="mt-8 rounded-lg border bg-white p-6 text-slate-500">
                        No exceptions found.
                    </div>
                )}

                {!loading && !error && exceptions.length > 0 && (
                    <div className="mt-8 overflow-hidden rounded-lg border bg-white">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4">
                                        Transaction
                                    </th>
                                    <th className="px-6 py-4">
                                        Issue
                                    </th>
                                    <th className="px-6 py-4">
                                        Severity
                                    </th>
                                    <th className="px-6 py-4">
                                        Status
                                    </th>
                                    <th className="px-6 py-4">
                                        Created
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {exceptions.map((exception) => (
                                    <tr
                                        key={exception.id}
                                        className="border-b last:border-b-0"
                                    >
                                        <td className="px-6 py-4 font-mono text-xs">
                                            {exception.transactionId}
                                        </td>

                                        <td className="px-6 py-4">
                                            {exception.issue}
                                        </td>

                                        <td className="px-6 py-4">
                                            {exception.severity}
                                        </td>

                                        <td className="px-6 py-4">
                                            {exception.status}
                                        </td>

                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(
                                                exception.createdAt,
                                            ).toLocaleString()}
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