export const transactionStates = [
    "PENDING",
    "CANDIDATES_FOUND",
    "MATCHED",
    "NO_MATCH",
    "REVIEW_REQUIRED",
] as const;

export type TransactionState = (typeof transactionStates)[number];

const allowedTransitions: Record<
    TransactionState,
    readonly TransactionState[]
> = {
    PENDING: ["CANDIDATES_FOUND"],
    CANDIDATES_FOUND: ["MATCHED", "NO_MATCH", "REVIEW_REQUIRED"],
    MATCHED: [],
    NO_MATCH: [],
    REVIEW_REQUIRED: [],
};

export function canTransition(
    from: TransactionState,
    to: TransactionState,
): boolean {
    return allowedTransitions[from].includes(to);
}

export function transitionTransactionState(
    from: TransactionState,
    to: TransactionState,
): TransactionState {
    if (!canTransition(from, to)) {
        throw new Error(
            `Invalid transaction state transition: ${from} -> ${to}`,
        );
    }

    return to;
}