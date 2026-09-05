// Types mirror the existing Express reconciliation API.
// Adjust field names here once you confirm the real response shape —
// everything downstream (services, components) reads through these types only.

export type BatchStatus =
    | "PENDING"
    | "SYNCING"
    | "RECONCILING"
    | "COMPLETED"
    | "FAILED";

export type ResultStatus = "MATCHED" | "REVIEW_REQUIRED" | "NO_MATCH";
export type ExceptionSeverity = "HIGH" | "MEDIUM" | "LOW";
export type ExceptionStatus = "OPEN" | "RESOLVED";

export interface ReconciliationStatus {
    id: string;
    status: BatchStatus;
    createdAt: string;
    updatedAt: string;
    totalTransactions?: number;
}

export interface EvidenceItem {
    label: string; // "Payment ID" | "Amount" | "Currency" | "Refund Status"
    pass: boolean;
}

export interface ReconciliationResult {
    id: string;
    transactionId: string;
    amount: number;
    currency: string;
    status: ResultStatus;
    confidence?: number | null;
    reason?: string | null;

    source?: {
        paymentId?: string;
        orderId?: string;
    };

    candidate?: {
        paymentId?: string;
        amount?: number;
        currency?: string;
        captureStatus?: string;
    };

    evidence?: EvidenceItem[];
}

export interface ReconciliationException {
    id: string;
    transactionId: string;
    severity: ExceptionSeverity;
    issue: string;
    status: ExceptionStatus;
    createdAt: string;
}

export interface AuditEvent {
    id: string;
    type: string; // e.g. "RECONCILIATION_CREATED" | "EXCEPTION_CREATED" | "AI_INVESTIGATION"
    message: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

export interface SyncResponse {
    batchId: string;
}

export interface InvestigationRequest {
    paymentExternalId: string;
}

export interface InvestigationResponse {
    status: "COMPLETED" | "RUNNING" | "FAILED";
    iterations: number;
    observations: unknown[];
    output: {
        summary: string;
        evidence: EvidenceItem[];
        financialStatus: "SUPPORTED" | "UNSUPPORTED" | "INCONCLUSIVE";
    };
}

// Derived shape the Dashboard renders from status + results + exceptions.
export interface DashboardSummary {
    total: number;
    matched: number;
    reviewRequired: number;
    noMatch: number;
    openExceptions: number;
}

export interface TransactionInvestigationResponse {
    transaction: {
        id: string;
        externalId: string;
        amount: string;
        currency: string;
        status: string;
    };

    reconciliation: {
        id: string;
        status: string;
        confidence: number | null;
        reason: string | null;
    };

    investigation: {
        status:
        | "COMPLETED"
        | "MAX_ITERATIONS"
        | "TIMEOUT";

        output: unknown;

        observations: Array<{
            toolName: string;
            output: unknown;
        }>;

        iterations: number;
    };
}