import type { Request } from "express";
import { z } from "zod";

export function parseBody<T extends z.ZodType>(
    schema: T,
    request: Request,
): z.infer<T> {
    return schema.parse(request.body);
}

export function parseParams<T extends z.ZodType>(
    schema: T,
    request: Request,
): z.infer<T> {
    return schema.parse(request.params);
}