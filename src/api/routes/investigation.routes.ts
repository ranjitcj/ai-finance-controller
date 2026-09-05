import {
    Router,
} from "express";

import {
    investigateTransactionController,
} from "../controllers/investigation.controller.js";

export const investigationRouter =
    Router();

investigationRouter.post(
    "/transaction",
    investigateTransactionController,
);