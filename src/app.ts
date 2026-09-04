import express from "express";

import reconciliationRoutes from "./api/routes/reconciliation.routes.js";
import { apiErrorHandler } from "./api/error-handler.js";

const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
    response.json({
        status: "ok",
        service: "ai-finance-controller",
    });
});

app.use("/api/reconciliation", reconciliationRoutes);

app.use(apiErrorHandler);

export default app;