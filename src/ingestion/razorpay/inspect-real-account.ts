import "dotenv/config";

import { RazorpayClient } from "./razorpay.client.js";
import { ingestRazorpay } from "./razorpay.ingestion.js";

async function main() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error(
            "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required",
        );
    }

    const client = new RazorpayClient({
        keyId,
        keySecret,
    });

    console.log("Connecting to Razorpay...");

    const result = await ingestRazorpay(client, {
        pageSize: 10,
        maxPages: 1,
        dateRange: {
            from: "2026-09-01",
            to: "2026-09-05",
        },
    });

    console.log("");
    console.log("Razorpay connection: OK");
    console.log("");
    console.log(`Orders:             ${result.rawOrders.length}`);
    console.log(`Payments:           ${result.rawPayments.length}`);
    console.log(`Refunds:            ${result.rawRefunds.length}`);
    console.log(`Settlements:        ${result.rawSettlements.length}`);
    console.log(
        `Settlement recon:   ${result.rawSettlementRecon.length}`,
    );
    console.log("");

    console.log("Sample records:");

    if (result.rawOrders[0]) {
        console.log(`Order:       ${result.rawOrders[0].id}`);
    }

    if (result.rawPayments[0]) {
        console.log(`Payment:     ${result.rawPayments[0].id}`);
    }

    if (result.rawRefunds[0]) {
        console.log(`Refund:      ${result.rawRefunds[0].id}`);
    }

    if (result.rawSettlements[0]) {
        console.log(`Settlement:  ${result.rawSettlements[0].id}`);
    }
}

main().catch((error) => {
    console.error("");
    console.error("Razorpay inspection failed.");
    console.error(
        error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
});