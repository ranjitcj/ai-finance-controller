import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    RazorpayApiError,
    RazorpayClient,
} from "../../src/ingestion/razorpay/razorpay.client.js";

describe("RazorpayClient", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("sends Basic Auth credentials", async () => {
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(
                new Response(
                    JSON.stringify({
                        id: "order_123",
                    }),
                    {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    },
                ),
            );

        const client = new RazorpayClient({
            keyId: "rzp_test_key",
            keySecret: "test_secret",
        });

        await client.get({
            path: "/orders",
        });

        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.razorpay.com/v1/orders",
            expect.objectContaining({
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization:
                        "Basic cnpwX3Rlc3Rfa2V5OnRlc3Rfc2VjcmV0",
                },
            }),
        );
    });

    it("passes query parameters", async () => {
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(
                new Response(
                    JSON.stringify({
                        items: [],
                    }),
                    {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    },
                ),
            );

        const client = new RazorpayClient({
            keyId: "rzp_test_key",
            keySecret: "test_secret",
        });

        await client.get({
            path: "/orders",
            query: {
                count: 10,
                skip: 20,
            },
        });

        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.razorpay.com/v1/orders?count=10&skip=20",
            expect.anything(),
        );
    });

    it("throws RazorpayApiError for HTTP failures", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(
                JSON.stringify({
                    error: {
                        description: "Invalid API credentials",
                    },
                }),
                {
                    status: 401,
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            ),
        );

        const client = new RazorpayClient({
            keyId: "rzp_test_key",
            keySecret: "test_secret",
        });

        await expect(
            client.get({
                path: "/orders",
            }),
        ).rejects.toMatchObject({
            name: "RazorpayApiError",
            status: 401,
            message: "Invalid API credentials",
        });

        await expect(
            client.get({
                path: "/orders",
            }),
        ).rejects.toBeInstanceOf(RazorpayApiError);
    });

    it("requires credentials", () => {
        expect(
            () =>
                new RazorpayClient({
                    keyId: "",
                    keySecret: "secret",
                }),
        ).toThrow("Razorpay key ID is required");

        expect(
            () =>
                new RazorpayClient({
                    keyId: "rzp_test_key",
                    keySecret: "",
                }),
        ).toThrow("Razorpay key secret is required");
    });
});