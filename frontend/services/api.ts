import type {
  ReconciliationStatus,
  ReconciliationResult,
  ReconciliationException,
  AuditEvent,
  SyncResponse,
  TransactionInvestigationResponse,
  // InvestigationRequest,
  // InvestigationResponse,
} from "@/types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";

// async function request<T>(path: string, options?: RequestInit): Promise<T> {
//   const res = await fetch(`${BASE_URL}${path}`, {
//     headers: { "Content-Type": "application/json" },
//     ...options,
//   });
//   if (!res.ok) {
//     const body = await res.text().catch(() => "");
//     throw new Error(`API ${path} failed (${res.status}): ${body}`);
//   }
//   // 204s / empty bodies from POST /run etc.
//   const text = await res.text();
//   return (text ? JSON.parse(text) : (undefined as unknown)) as T;
// }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${path} failed (${res.status}): ${body}`);
  }

  const text = await res.text();

  if (!text) {
    return undefined as unknown as T;
  }

  const body = JSON.parse(text) as { data?: T };

  return body.data !== undefined
    ? body.data
    : (body as unknown as T);
}

// ---- Reconciliation ----

export const syncReconciliation = (from: string, to: string) =>
  request<SyncResponse>("/reconciliation/sync", {
    method: "POST",
    body: JSON.stringify({ from, to }),
  });

export const runReconciliation = (batchId: string) =>
  request<void>(`/reconciliation/${batchId}/run`, { method: "POST" });

export const getReconciliationStatus = (id: string) =>
  request<ReconciliationStatus>(`/reconciliation/${id}/status`);

// export const getReconciliationResults = (id: string) =>
//   request<ReconciliationResult[]>(`/reconciliation/${id}/results`);

// export const getReconciliationExceptions = (id: string) =>
//   request<ReconciliationException[]>(`/reconciliation/${id}/exceptions`);

// export const getReconciliationAudit = (id: string) =>
//   request<AuditEvent[]>(`/reconciliation/${id}/audit`);

export const getReconciliationResults = async (id: string) => {
  const response = await request<{
    batchId: string;
    results: ReconciliationResult[];
  }>(`/reconciliation/${id}/results`);

  return response.results;
};

export const getReconciliationExceptions = async (id: string) => {
  const response = await request<{
    batchId: string;
    exceptions: ReconciliationException[];
  }>(`/reconciliation/${id}/exceptions`);

  return response.exceptions;
};

export const getReconciliationAudit = async (id: string) => {
  const response = await request<{
    batchId: string;
    events: AuditEvent[];
  }>(`/reconciliation/${id}/audit`);

  return response.events;
};

// ---- Investigation (new thin endpoint — add on the backend before wiring the AI page) ----

// export const runPaymentInvestigation = (paymentExternalId: string) =>
//   request<InvestigationResponse>("/investigation/payment", {
//     method: "POST",
//     body: JSON.stringify({ paymentExternalId } satisfies InvestigationRequest),
//   });

// ---- Convenience: full sync → run → poll-until-done flow used by the Dashboard ----

// export async function startAndRunBatch(from: string, to: string): Promise<string> {
//   const { batchId } = await syncReconciliation(from, to);
//   await runReconciliation(batchId);
//   return batchId;
// }
export async function startAndRunBatch(
  from: string,
  to: string,
) {
  const { batchId } = await syncReconciliation(
    from,
    to,
  );

  localStorage.setItem(
    "reconciliationBatchId",
    batchId,
  );

  await runReconciliation(batchId);

  return batchId;
}

export async function pollBatchUntilDone(
  batchId: string,
  { intervalMs = 1500, timeoutMs = 60_000 } = {}
): Promise<ReconciliationStatus> {
  const start = Date.now();
  while (true) {
    const status = await getReconciliationStatus(batchId);
    if (status.status === "COMPLETED" || status.status === "FAILED") return status;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Batch ${batchId} did not finish within ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export const investigateTransaction = (
  transactionId: string,
) =>
  request<TransactionInvestigationResponse>(
    "/investigation/transaction",
    {
      method: "POST",
      body: JSON.stringify({
        transactionId,
      }),
    },
  );