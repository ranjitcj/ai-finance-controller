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

export interface RazorpayPostRequestOptions {
    path: string;
    body?: unknown;
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

    private getAuthHeader(): string {
        const credentials = Buffer.from(
            `${this.keyId}:${this.keySecret}`,
            "utf8",
        ).toString("base64");

        return `Basic ${credentials}`;
    }

    private async handleResponse<T>(
        response: Response,
    ): Promise<T> {
        if (!response.ok) {
            let message =
                `Razorpay API returned HTTP ${response.status}`;

            try {
                const body: unknown =
                    await response.json();

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

    async get<T>(
        options: RazorpayRequestOptions,
    ): Promise<T> {
        const path = options.path.startsWith("/")
            ? options.path
            : `/${options.path}`;

        const url = new URL(
            `${this.baseUrl}${path}`,
        );

        for (const [key, value] of Object.entries(
            options.query ?? {},
        )) {
            if (value !== undefined) {
                url.searchParams.set(
                    key,
                    String(value),
                );
            }
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: this.getAuthHeader(),
            },
        });

        return this.handleResponse<T>(response);
    }

    async post<T>(
        options: RazorpayPostRequestOptions,
    ): Promise<T> {
        const path = options.path.startsWith("/")
            ? options.path
            : `/${options.path}`;

        const url = new URL(
            `${this.baseUrl}${path}`,
        );

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: this.getAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(options.body ?? {}),
        });

        return this.handleResponse<T>(response);
    }
}