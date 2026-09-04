import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const apiErrorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    next,
) => {
    void next;

    if (
        error instanceof ZodError ||
        (
            typeof error === "object" &&
            error !== null &&
            "issues" in error &&
            Array.isArray(error.issues)
        )
    ) {
        const issues = (
            error as {
                issues: Array<{ message: string }>;
            }
        ).issues;

        response.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: issues
                    .map((issue) => issue.message)
                    .join("; "),
            },
        });

        return;
    }

    console.error(error);

    response.status(500).json({
        error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
        },
    });
};