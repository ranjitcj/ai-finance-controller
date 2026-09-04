import { describe, expect, it } from "vitest";

import app from "../../src/app.js";

describe("Reconciliation API", () => {
    it("returns health status", async () => {
        const server = app.listen(0);

        try {
            const address = server.address();

            if (!address || typeof address === "string") {
                throw new Error("Test server did not start");
            }

            const response = await fetch(
                `http://127.0.0.1:${address.port}/health`,
            );

            expect(response.status).toBe(200);

            await expect(response.json()).resolves.toEqual({
                status: "ok",
                service: "ai-finance-controller",
            });
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        }
    });

    it("rejects an invalid reconciliation sync request", async () => {
        const server = app.listen(0);

        try {
            const address = server.address();

            if (!address || typeof address === "string") {
                throw new Error("Test server did not start");
            }

            const response = await fetch(
                `http://127.0.0.1:${address.port}/api/reconciliation/sync`,
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "2026-09-10",
                        to: "2026-09-01",
                    }),
                },
            );

            expect(response.status).toBe(400);

            const body = await response.json();

            expect(body.error.code).toBe("VALIDATION_ERROR");
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        }
    });
});