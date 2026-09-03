import {
    describe,
    expect,
    it,
} from "vitest";

import {
    InvestigationTimeoutError,
    withTimeout,
} from "../../src/investigation/agent/timeout.js";

describe("Investigation timeout", () => {
    it("returns when operation completes before timeout", async () => {
        const result = await withTimeout(
            Promise.resolve("completed"),
            100,
        );

        expect(result).toBe("completed");
    });

    it("times out a slow operation", async () => {
        const operation = new Promise<string>((resolve) => {
            setTimeout(() => {
                resolve("too late");
            }, 100);
        });

        await expect(
            withTimeout(operation, 10),
        ).rejects.toBeInstanceOf(
            InvestigationTimeoutError,
        );
    });

    it("rejects zero timeout", async () => {
        await expect(
            withTimeout(
                Promise.resolve("value"),
                0,
            ),
        ).rejects.toThrow(
            "timeoutMs must be greater than zero.",
        );
    });

    it("rejects negative timeout", async () => {
        await expect(
            withTimeout(
                Promise.resolve("value"),
                -1,
            ),
        ).rejects.toThrow(
            "timeoutMs must be greater than zero.",
        );
    });
});