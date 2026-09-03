export class InvestigationTimeoutError extends Error {
    constructor() {
        super("Investigation timed out.");
        this.name = "InvestigationTimeoutError";
    }
}

export async function withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new Error("timeoutMs must be greater than zero.");
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            operation,
            new Promise<T>((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new InvestigationTimeoutError());
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutHandle !== undefined) {
            clearTimeout(timeoutHandle);
        }
    }
}