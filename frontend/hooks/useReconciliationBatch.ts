"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getReconciliationAudit,
  getReconciliationExceptions,
  getReconciliationResults,
  getReconciliationStatus,
  startAndRunBatch,
  pollBatchUntilDone,
} from "@/services/api";
import type {
  AuditEvent,
  DashboardSummary,
  ReconciliationException,
  ReconciliationResult,
  ReconciliationStatus,
} from "@/types/api";

// Swap this for real persistence (query param, DB "latest batch" endpoint, etc.)
// once you have one. For the demo, the last batch id lives in localStorage so a
// page refresh doesn't lose it.
const STORAGE_KEY = "rfc:lastBatchId";

function readStoredBatchId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function storeBatchId(id: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
}

export function useReconciliationBatch() {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [status, setStatus] = useState<ReconciliationStatus | null>(null);
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [exceptions, setExceptions] = useState<ReconciliationException[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBatchData = useCallback(async (id: string) => {
    const [statusRes, resultsRes, exceptionsRes, auditRes] = await Promise.all([
      getReconciliationStatus(id),
      getReconciliationResults(id),
      getReconciliationExceptions(id),
      getReconciliationAudit(id),
    ]);
    setStatus(statusRes);
    setResults(resultsRes);
    setExceptions(exceptionsRes);
    setAudit(auditRes);
  }, []);

  // Load whatever batch was last synced, on mount.
  useEffect(() => {
    const stored = readStoredBatchId();
    if (!stored) {
      setLoading(false);
      return;
    }
    setBatchId(stored);
    loadBatchData(stored)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load batch"))
      .finally(() => setLoading(false));
  }, [loadBatchData]);

  const sync = useCallback(
    async (from: string, to: string) => {
      setSyncing(true);
      setError(null);
      try {
        const newBatchId = await startAndRunBatch(from, to);
        storeBatchId(newBatchId);
        setBatchId(newBatchId);
        const finalStatus = await pollBatchUntilDone(newBatchId);
        if (finalStatus.status === "FAILED") {
          throw new Error("Reconciliation batch failed");
        }
        await loadBatchData(newBatchId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sync failed");
        throw e;
      } finally {
        setSyncing(false);
      }
    },
    [loadBatchData]
  );

  const summary: DashboardSummary = {
    total: results.length,
    matched: results.filter((r) => r.status === "MATCHED").length,
    reviewRequired: results.filter((r) => r.status === "REVIEW_REQUIRED").length,
    noMatch: results.filter((r) => r.status === "NO_MATCH").length,
    openExceptions: exceptions.filter((e) => e.status === "OPEN").length,
  };

  return {
    batchId,
    status,
    results,
    exceptions,
    audit,
    summary,
    loading,
    syncing,
    error,
    sync,
  };
}