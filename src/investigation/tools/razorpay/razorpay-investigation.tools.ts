import type { InferSelectModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

import { db } from "../../../db/client.js";
import {
  razorpayOrders,
  razorpayPayments,
  razorpayRefunds,
  razorpaySettlementRecons,
  razorpaySettlements,
} from "../../../db/schema/razorpay.schema.js";

import {
  findRazorpayCandidates,
  type RazorpayCandidate,
  type RazorpayCandidateEntity,
  type RazorpayCandidateSearchInput,
} from "../../../reconciliation/retrieval/razorpay-candidate-retrieval.js";

type RazorpayOrder = InferSelectModel<typeof razorpayOrders>;
type RazorpayPayment = InferSelectModel<typeof razorpayPayments>;
type RazorpayRefund = InferSelectModel<typeof razorpayRefunds>;
type RazorpaySettlementRecon = InferSelectModel<typeof razorpaySettlementRecons>;
type RazorpaySettlement = InferSelectModel<typeof razorpaySettlements>;

export type RazorpayInvestigationToolInput = RazorpayCandidateSearchInput;
export interface RazorpayInvestigationResult {
  candidates: RazorpayCandidate[];
  count: number;
  nativeMatchFound: boolean;
}

export interface RazorpayEntityLookupInput {
  entityType: RazorpayCandidateEntity;
  externalId: string;
  batchId?: string;
}

export interface RazorpayEntityLookupResult {
  entityType: RazorpayCandidateEntity;
  found: boolean;
  entity:
    | RazorpayOrder
    | RazorpayPayment
    | RazorpayRefund
    | RazorpaySettlementRecon
    | RazorpaySettlement
    | null;
}

/**
 * Razorpay-native candidate investigation.
 *
 * The investigator may use this tool to discover persisted Razorpay
 * entities and native relationships.
 *
 * This function is intentionally READ-ONLY.
 *
 * It does NOT:
 * - decide MATCH / REJECT / REVIEW
 * - invoke Decision Policy
 * - create candidates
 * - create reconciliation results
 * - perform fuzzy matching
 */
export async function investigateRazorpayCandidates(
  input: RazorpayInvestigationToolInput,
): Promise<RazorpayInvestigationResult> {
  const candidates = await findRazorpayCandidates(input);

  return {
    candidates,
    count: candidates.length,
    nativeMatchFound: candidates.length > 0,
  };
}

/**
 * Retrieve one persisted Razorpay entity by its native external ID.
 *
 * This is useful when the investigator already knows the entity type
 * and wants to inspect the complete persisted record.
 */
export async function investigateRazorpayEntity(
  input: RazorpayEntityLookupInput,
): Promise<RazorpayEntityLookupResult> {
  const { entityType, externalId, batchId } = input;

  switch (entityType) {
    case "ORDER": {
      const conditions = batchId
        ? and(eq(razorpayOrders.externalId, externalId), eq(razorpayOrders.batchId, batchId))
        : eq(razorpayOrders.externalId, externalId);

      const [entity] = await db.select().from(razorpayOrders).where(conditions).limit(1);

      return {
        entityType,
        found: entity !== undefined,
        entity: entity ?? null,
      };
    }

    case "PAYMENT": {
      const conditions = batchId
        ? and(eq(razorpayPayments.externalId, externalId), eq(razorpayPayments.batchId, batchId))
        : eq(razorpayPayments.externalId, externalId);

      const [entity] = await db.select().from(razorpayPayments).where(conditions).limit(1);

      return {
        entityType,
        found: entity !== undefined,
        entity: entity ?? null,
      };
    }

    case "REFUND": {
      const conditions = batchId
        ? and(eq(razorpayRefunds.externalId, externalId), eq(razorpayRefunds.batchId, batchId))
        : eq(razorpayRefunds.externalId, externalId);

      const [entity] = await db.select().from(razorpayRefunds).where(conditions).limit(1);

      return {
        entityType,
        found: entity !== undefined,
        entity: entity ?? null,
      };
    }

    case "SETTLEMENT_RECON": {
      const conditions = batchId
        ? and(
            eq(razorpaySettlementRecons.externalId, externalId),
            eq(razorpaySettlementRecons.batchId, batchId),
          )
        : eq(razorpaySettlementRecons.externalId, externalId);

      const [entity] = await db.select().from(razorpaySettlementRecons).where(conditions).limit(1);

      return {
        entityType,
        found: entity !== undefined,
        entity: entity ?? null,
      };
    }

    case "SETTLEMENT": {
      const conditions = batchId
        ? and(
            eq(razorpaySettlements.externalId, externalId),
            eq(razorpaySettlements.batchId, batchId),
          )
        : eq(razorpaySettlements.externalId, externalId);

      const [entity] = await db.select().from(razorpaySettlements).where(conditions).limit(1);

      return {
        entityType,
        found: entity !== undefined,
        entity: entity ?? null,
      };
    }
  }
}
