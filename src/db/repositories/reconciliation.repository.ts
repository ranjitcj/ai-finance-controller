import { db } from "../client.js";
import {
    candidates,
    evidence,
    reconciliationResults,
    exceptions,
    auditEvents,
} from "../schema/reconciliation.schema.js";

export interface CreateEvidenceInput {
    reconciliationResultId: string;
    candidateId?: string;
    field: string;
    sourceValue?: string;
    candidateValue?: string;
    explanation: string;
}

export async function createEvidence(input: CreateEvidenceInput) {
    const [created] = await db
        .insert(evidence)
        .values({
            reconciliationResultId: input.reconciliationResultId,
            candidateId: input.candidateId,
            field: input.field,
            sourceValue: input.sourceValue,
            candidateValue: input.candidateValue,
            explanation: input.explanation,
        })
        .returning();

    if (!created) {
        throw new Error("Failed to create evidence");
    }

    return created;
}

export interface CreateReconciliationResultInput {
    transactionId: string;
    status: "MATCHED" | "NO_MATCH" | "REVIEW_REQUIRED" | "FAILED";
    confidence?: number;
    reason?: string;
}
export interface CreateCandidateInput {
    reconciliationResultId: string;
    transactionId: string;
    score: number;
    decision: "MATCH" | "REJECT" | "REVIEW";
    reason?: string;
}

export async function createCandidate(input: CreateCandidateInput) {
    const [candidate] = await db
        .insert(candidates)
        .values({
            reconciliationResultId: input.reconciliationResultId,
            transactionId: input.transactionId,
            score: input.score,
            decision: input.decision,
            reason: input.reason,
        })
        .returning();

    if (!candidate) {
        throw new Error("Failed to create candidate");
    }

    return candidate;
}

export async function createReconciliationResult(input: CreateReconciliationResultInput) {
    const [result] = await db
        .insert(reconciliationResults)
        .values({
            transactionId: input.transactionId,
            status: input.status,
            confidence: input.confidence,
            reason: input.reason,
        })
        .returning();

    if (!result) {
        throw new Error("Failed to create reconciliation result");
    }

    return result;
}

export interface CreateExceptionInput {
    transactionId: string;
    reconciliationResultId?: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    code: string;
    message: string;
}

export async function createException(
    input: CreateExceptionInput,
) {
    const [exception] = await db
        .insert(exceptions)
        .values({
            transactionId: input.transactionId,
            reconciliationResultId: input.reconciliationResultId,
            severity: input.severity,
            code: input.code,
            message: input.message,
        })
        .returning();

    if (!exception) {
        throw new Error("Failed to create exception");
    }

    return exception;
}

export interface CreateAuditEventInput {
    batchId?: string;
    transactionId?: string;
    eventType:
    | "BATCH_CREATED"
    | "FILE_INGESTED"
    | "TRANSACTION_CREATED"
    | "RECONCILIATION_CREATED"
    | "EXCEPTION_CREATED"
    | "EXCEPTION_RESOLVED";
    message: string;
    metadata?: string;
}

export async function createAuditEvent(
    input: CreateAuditEventInput,
) {
    const [event] = await db
        .insert(auditEvents)
        .values({
            batchId: input.batchId,
            transactionId: input.transactionId,
            eventType: input.eventType,
            message: input.message,
            metadata: input.metadata,
        })
        .returning();

    if (!event) {
        throw new Error("Failed to create audit event");
    }

    return event;
}