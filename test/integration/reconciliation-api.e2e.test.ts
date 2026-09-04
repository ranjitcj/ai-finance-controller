import { createServer, type Server } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import app from "../../src/app.js";

const razorpayResponses = {
    orders: {
        items: [
            {
                id: "order_test_001",
                entity: "order",
                amount: 10000,
                currency: "INR",
                status: "paid",
                created_at: 1756771200,
            },
        ],
    },

    payments: {
        items: [
            {
                id: "pay_test_001",
                entity: "payment",
                amount: 10000,
                currency: "INR",
                status: "captured",
                order_id: "order_test_001",
                created_at: 1756771200,
            },
        ],
    },

    refunds: {
        items: [],
    },

    settlements: {
        items: [
            {
                id: "setl_test_001",
                entity: "settlement",
                amount: 10000,
                status: "processed",
                created_at: 1756771200,
            },
        ],
    },

    settlementRecon: {
        items: [],
    },
};

let razorpayServer: Server | undefined;

afterEach(async () => {
    if (!razorpayServer) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        razorpayServer?.close((error) => {
            razorpayServer = undefined;

            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
});

async function startRazorpayMock(): Promise<string> {
    razorpayServer = createServer((request, response) => {
        response.setHeader("content-type", "application/json");

        switch (request.url?.split("?")[0]) {
            case "/v1/orders":
                response.end(JSON.stringify(razorpayResponses.orders));
                return;

            case "/v1/payments":
                response.end(JSON.stringify(razorpayResponses.payments));
                return;

            case "/v1/refunds":
                response.end(JSON.stringify(razorpayResponses.refunds));
                return;

            case "/v1/settlements":
                response.end(JSON.stringify(razorpayResponses.settlements));
                return;

            case "/v1/settlement_recon":
                response.end(
                    JSON.stringify(razorpayResponses.settlementRecon),
                );
                return;

            default:
                response.statusCode = 404;
                response.end(
                    JSON.stringify({
                        error: {
                            description: "Mock Razorpay endpoint not found",
                        },
                    }),
                );
        }
    });

    await new Promise<void>((resolve, reject) => {
        razorpayServer?.listen(0, "127.0.0.1", () => resolve());
        razorpayServer?.once("error", reject);
    });

    const address = razorpayServer.address();

    if (!address || typeof address === "string") {
        throw new Error("Razorpay mock server did not start");
    }

    return `http://127.0.0.1:${address.port}/v1`;
}

async function startAppServer(): Promise<Server> {
    const server = app.listen(0, "127.0.0.1");

    await new Promise<void>((resolve, reject) => {
        server.once("listening", () => resolve());
        server.once("error", reject);
    });

    return server;
}

describe("Reconciliation API end-to-end", () => {
    it("syncs Razorpay data and exposes reconciliation endpoints", async () => {
        const razorpayBaseUrl = await startRazorpayMock();

        process.env.RAZORPAY_KEY_ID = "test_key";
        process.env.RAZORPAY_KEY_SECRET = "test_secret";
        process.env.RAZORPAY_BASE_URL = razorpayBaseUrl;

        const server = await startAppServer();

        try {
            const address = server.address();

            if (!address || typeof address === "string") {
                throw new Error("Application server did not start");
            }

            const baseUrl = `http://127.0.0.1:${address.port}`;

            const syncResponse = await fetch(
                `${baseUrl}/api/reconciliation/sync`,
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "2025-09-01",
                        to: "2025-09-02",
                    }),
                },
            );

            expect(syncResponse.status).toBe(201);

            const syncBody = await syncResponse.json();

            expect(syncBody.data.batchId).toEqual(expect.any(String));
            expect(syncBody.data.sourceFileId).toEqual(expect.any(String));
            expect(syncBody.data.status).toBe("COMPLETED");

            const batchId = syncBody.data.batchId as string;

            const runResponse = await fetch(
                `${baseUrl}/api/reconciliation/${batchId}/run`,
                {
                    method: "POST",
                },
            );

            expect(runResponse.status).toBe(200);

            const runBody = await runResponse.json();

            expect(runBody.data.batchId).toBe(batchId);
            expect(runBody.data.processed).toBeGreaterThan(0);

            const statusResponse = await fetch(
                `${baseUrl}/api/reconciliation/${batchId}/status`,
            );

            expect(statusResponse.status).toBe(200);

            const statusBody = await statusResponse.json();

            expect(statusBody.data.batchId).toBe(batchId);
            expect(statusBody.data.status).toBe("COMPLETED");

            const resultsResponse = await fetch(
                `${baseUrl}/api/reconciliation/${batchId}/results`,
            );

            expect(resultsResponse.status).toBe(200);

            const resultsBody = await resultsResponse.json();

            expect(resultsBody.data.batchId).toBe(batchId);
            expect(Array.isArray(resultsBody.data.results)).toBe(true);
            expect(resultsBody.data.results.length).toBeGreaterThan(0);

            const exceptionsResponse = await fetch(
                `${baseUrl}/api/reconciliation/${batchId}/exceptions`,
            );

            expect(exceptionsResponse.status).toBe(200);

            const exceptionsBody = await exceptionsResponse.json();

            expect(exceptionsBody.data.batchId).toBe(batchId);
            expect(Array.isArray(exceptionsBody.data.exceptions)).toBe(true);

            const auditResponse = await fetch(
                `${baseUrl}/api/reconciliation/${batchId}/audit`,
            );

            expect(auditResponse.status).toBe(200);

            const auditBody = await auditResponse.json();

            expect(auditBody.data.batchId).toBe(batchId);
            expect(Array.isArray(auditBody.data.events)).toBe(true);
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