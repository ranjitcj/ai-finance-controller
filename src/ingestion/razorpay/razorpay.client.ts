import { Buffer } from "node:buffer";

const DEFAULT_BASE_URL = "https://api.razorpay.com/v1";

export interface RazorpayClientConfig {
    keyId: string;
    keySecret: string;
    baseUrl?: string;
}

export interface RazorpayRequestOptions {
    path: string;
    query?: Record<
        string,
        string | number | boolean | undefined
    >;
}

export class RazorpayApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "RazorpayApiError";
        this.status = status;
    }
}

export class RazorpayClient {
    private readonly keyId: string;
    private readonly keySecret: string;
    private readonly baseUrl: string;

    constructor(config: RazorpayClientConfig) {
        if (!config.keyId?.trim()) {
            throw new Error("Razorpay key ID is required");
        }

        if (!config.keySecret?.trim()) {
            throw new Error("Razorpay key secret is required");
        }

        this.keyId = config.keyId;
        this.keySecret = config.keySecret;
        this.baseUrl = (
            config.baseUrl ?? DEFAULT_BASE_URL
        ).replace(/\/+$/, "");
    }

    async get<T>(
        options: RazorpayRequestOptions,
    ): Promise<T> {
        const path = options.path.startsWith("/")
            ? options.path
            : `/${options.path}`;

        const url = new URL(`${this.baseUrl}${path}`);

        for (const [key, value] of Object.entries(
            options.query ?? {},
        )) {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        }

        const credentials = Buffer.from(
            `${this.keyId}:${this.keySecret}`,
            "utf8",
        ).toString("base64");

        const response = await fetch(
            url.toString(),
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Basic ${credentials}`,
                },
            },
        );

        if (!response.ok) {
            let message =
                `Razorpay API returned HTTP ${response.status}`;

            try {
                const body: unknown = await response.json();

                if (
                    typeof body === "object" &&
                    body !== null &&
                    "error" in body
                ) {
                    const error = body.error;

                    if (
                        typeof error === "object" &&
                        error !== null &&
                        "description" in error &&
                        typeof error.description === "string"
                    ) {
                        message = error.description;
                    }
                }
            } catch {
                // Keep the HTTP status message when the
                // response body is not valid JSON.
            }

            throw new RazorpayApiError(
                response.status,
                message,
            );
        }

        return (await response.json()) as T;
    }
}