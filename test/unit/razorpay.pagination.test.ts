import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { RazorpayClient } from "../../src/ingestion/razorpay/razorpay.client.js";
import { fetchAllPages } from "../../src/ingestion/razorpay/razorpay.pagination.js";

const stringListSchema = z.object({
    items: z.array(z.string()),
});

describe("fetchAllPages", () => {
    it("fetches multiple pages until the final partial page", async () => {
        const get = vi
            .fn()
            .mockResolvedValueOnce({
                items: ["A", "B"],
            })
            .mockResolvedValueOnce({
                items: ["C", "D"],
            })
            .mockResolvedValueOnce({
                items: ["E"],
            });

        const client = {
            get,
        } as unknown as RazorpayClient;

        const result = await fetchAllPages<string>(client, {
            path: "/orders",
            schema: stringListSchema,
            pageSize: 2,
        });

        expect(result).toEqual([
            "A",
            "B",
            "C",
            "D",
            "E",
        ]);

        expect(get).toHaveBeenCalledTimes(3);

        expect(get).toHaveBeenNthCalledWith(1, {
            path: "/orders",
            query: {
                count: 2,
                skip: 0,
            },
        });

        expect(get).toHaveBeenNthCalledWith(2, {
            path: "/orders",
            query: {
                count: 2,
                skip: 2,
            },
        });

        expect(get).toHaveBeenNthCalledWith(3, {
            path: "/orders",
            query: {
                count: 2,
                skip: 4,
            },
        });
    });

    it("stops immediately when the first page is partial", async () => {
        const get = vi.fn().mockResolvedValueOnce({
            items: ["A"],
        });

        const client = {
            get,
        } as unknown as RazorpayClient;

        const result = await fetchAllPages<string>(client, {
            path: "/payments",
            schema: stringListSchema,
            pageSize: 10,
        });

        expect(result).toEqual(["A"]);
        expect(get).toHaveBeenCalledTimes(1);
    });

    it("returns an empty result when the API returns no items", async () => {
        const get = vi.fn().mockResolvedValueOnce({
            items: [],
        });

        const client = {
            get,
        } as unknown as RazorpayClient;

        const result = await fetchAllPages<string>(client, {
            path: "/refunds",
            schema: stringListSchema,
            pageSize: 10,
        });

        expect(result).toEqual([]);
        expect(get).toHaveBeenCalledTimes(1);
    });

    it("honors maxPages", async () => {
        const get = vi.fn().mockResolvedValue({
            items: ["A", "B"],
        });

        const client = {
            get,
        } as unknown as RazorpayClient;

        const result = await fetchAllPages<string>(client, {
            path: "/settlements",
            schema: stringListSchema,
            pageSize: 2,
            maxPages: 2,
        });

        expect(result).toEqual([
            "A",
            "B",
            "A",
            "B",
        ]);

        expect(get).toHaveBeenCalledTimes(2);

        expect(get).toHaveBeenNthCalledWith(1, {
            path: "/settlements",
            query: {
                count: 2,
                skip: 0,
            },
        });

        expect(get).toHaveBeenNthCalledWith(2, {
            path: "/settlements",
            query: {
                count: 2,
                skip: 2,
            },
        });
    });

    it("rejects an invalid page size", async () => {
        const client = {} as RazorpayClient;

        await expect(
            fetchAllPages<string>(client, {
                path: "/orders",
                schema: stringListSchema,
                pageSize: 0,
            }),
        ).rejects.toThrow(
            "pageSize must be a positive integer",
        );
    });

    it("rejects an invalid maxPages", async () => {
        const client = {} as RazorpayClient;

        await expect(
            fetchAllPages<string>(client, {
                path: "/orders",
                schema: stringListSchema,
                maxPages: 0,
            }),
        ).rejects.toThrow(
            "maxPages must be a positive integer",
        );
    });

    it("rejects a malformed API response", async () => {
        const get = vi.fn().mockResolvedValueOnce({
            items: "not-an-array",
        });

        const client = {
            get,
        } as unknown as RazorpayClient;

        await expect(
            fetchAllPages<string>(client, {
                path: "/orders",
                schema: stringListSchema,
                pageSize: 10,
            }),
        ).rejects.toThrow("Invalid Razorpay response");
    });

    it("validates every page independently", async () => {
        const get = vi
            .fn()
            .mockResolvedValueOnce({
                items: ["A", "B"],
            })
            .mockResolvedValueOnce({
                items: [123],
            });

        const client = {
            get,
        } as unknown as RazorpayClient;

        await expect(
            fetchAllPages<string>(client, {
                path: "/orders",
                schema: stringListSchema,
                pageSize: 2,
            }),
        ).rejects.toThrow("Invalid Razorpay response");

        expect(get).toHaveBeenCalledTimes(2);
    });
});