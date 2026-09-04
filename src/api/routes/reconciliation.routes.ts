import { Router } from "express";

import {
    syncReconciliation,
    getReconciliationStatus,
    getReconciliationResults,
    getReconciliationExceptions,
    getReconciliationAudit,
    runReconciliationController,
} from "../controllers/reconciliation.controller.js";

const router = Router();

router.post(
    "/sync",
    syncReconciliation,
);

router.get(
    "/:id/status",
    getReconciliationStatus,
);

router.get(
    "/:id/results",
    getReconciliationResults,
);

router.get(
    "/:id/exceptions",
    getReconciliationExceptions,
);

router.get(
    "/:id/audit",
    getReconciliationAudit,
);

router.post(
    "/:batchId/run",
    runReconciliationController,
);

export default router;