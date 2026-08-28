import { z } from "zod";

import type { RazorpayClient } from "./razorpay.client.js";

export interface RazorpayPaginationOptions<T> {
    path: string;
    pageSize?: number;
    maxPages?: number;
    schema: z.ZodType<{
        items: T[];
    }>;
}

export async function fetchAllPages<T>(
    client: RazorpayClient,
    options: RazorpayPaginationOptions<T>,
): Promise<T[]> {
    const pageSize = options.pageSize ?? 100;
    const maxPages = options.maxPages;

    if (!Number.isInteger(pageSize) || pageSize <= 0) {
        throw new Error("pageSize must be a positive integer");
    }

    if (
        maxPages !== undefined &&
        (!Number.isInteger(maxPages) || maxPages <= 0)
    ) {
        throw new Error("maxPages must be a positive integer");
    }

    const results: T[] = [];
    let page = 0;

    while (
        maxPages === undefined ||
        page < maxPages
    ) {
        const skip = page * pageSize;

        const response = await client.get<unknown>({
            path: options.path,
            query: {
                count: pageSize,
                skip,
            },
        });

        const parsed = options.schema.safeParse(response);

        if (!parsed.success) {
            throw new Error(
                `Invalid Razorpay response: ${parsed.error.message}`,
            );
        }

        const items = parsed.data.items;

        results.push(...items);

        page += 1;

        if (items.length < pageSize) {
            break;
        }
    }

    return results;
}