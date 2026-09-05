import type {
    Request,
    Response,
} from "express";

import { z } from "zod";

import {
    investigateTransaction,
} from "../services/investigation/investigation.service.js";

const investigationRequestSchema =
    z.object({
        transactionId: z.uuid(),
    });

export async function investigateTransactionController(
    request: Request,
    response: Response,
) {
    const input =
        investigationRequestSchema.parse(
            request.body,
        );

    const result =
        await investigateTransaction(
            input.transactionId,
        );

    response.status(200).json({
        data: result,
    });
}