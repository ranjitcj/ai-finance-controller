import {
    findRazorpayCandidates,
} from "../retrieval/razorpay-candidate-retrieval.js";

export async function findRazorpaySourceCandidates(
    reference: string | undefined,
    batchId: string,
) {
    if (!reference) {
        return [];
    }

    const orders = await findRazorpayCandidates({
        externalId: reference,
        batchId,
    });

    const payments = await findRazorpayCandidates({
        orderId: reference,
        batchId,
    });

    return [
        ...orders,
        ...payments,
    ];
}