export type DateRuleResult =
    | "PASS"
    | "PASS_WITH_TOLERANCE"
    | "FAIL";

export interface DateRuleEvidence {
    rule: "DATE";
    result: DateRuleResult;
    sourceDate: string;
    candidateDate: string;
    differenceInDays: number;
    toleranceDays: number;
}

const DATE_TOLERANCE_DAYS = 1;

function dateToUtcDay(date: Date): number {
    return Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
    );
}

export function evaluateDateRule(
    sourceDate: Date,
    candidateDate: Date,
): DateRuleEvidence {
    const sourceDay = dateToUtcDay(sourceDate);
    const candidateDay = dateToUtcDay(candidateDate);

    const differenceInDays =
        Math.abs(candidateDay - sourceDay) / (1000 * 60 * 60 * 24);

    let result: DateRuleResult;

    if (differenceInDays === 0) {
        result = "PASS";
    } else if (differenceInDays <= DATE_TOLERANCE_DAYS) {
        result = "PASS_WITH_TOLERANCE";
    } else {
        result = "FAIL";
    }

    return {
        rule: "DATE",
        result,
        sourceDate: sourceDate.toISOString().slice(0, 10),
        candidateDate: candidateDate.toISOString().slice(0, 10),
        differenceInDays,
        toleranceDays: DATE_TOLERANCE_DAYS,
    };
}