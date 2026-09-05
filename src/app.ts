import express from "express";
import cors from "cors";
import reconciliationRoutes from "./api/routes/reconciliation.routes.js";
import { apiErrorHandler } from "./api/error-handler.js";
import { RazorpayClient } from "./ingestion/razorpay/razorpay.client.js";
import { investigationRouter } from "./api/routes/investigation.routes.js";

const app = express();

app.use(express.json());

app.use(
    cors({
        origin: "http://localhost:3000",
    }),
);

app.get("/health", (_request, response) => {
    response.json({
        status: "ok",
        service: "ai-finance-controller",
    });
});

/*
 * Temporary Razorpay Test Mode demo.
 *
 * The browser receives only the Test Key ID.
 * The Razorpay secret remains on the server.
 */
// app.get("/test-payment", (_request, response) => {
//     const keyId = process.env.RAZORPAY_KEY_ID;

//     if (!keyId) {
//         response.status(500).send(`
//             <h1>Razorpay Test Payment Not Configured</h1>
//             <p>RAZORPAY_KEY_ID is missing.</p>
//         `);
//         return;
//     }

//     response.type("html").send(`
// <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8" />
//     <meta
//         name="viewport"
//         content="width=device-width, initial-scale=1.0"
//     />
//     <title>Razorpay Test Payment</title>

//     <script src="https://checkout.razorpay.com/v1/checkout.js"></script>

//     <style>
//         body {
//             font-family: Arial, sans-serif;
//             max-width: 600px;
//             margin: 60px auto;
//             padding: 24px;
//         }

//         button {
//             padding: 12px 24px;
//             font-size: 16px;
//             cursor: pointer;
//         }

//         .info {
//             background: #f5f5f5;
//             padding: 16px;
//             margin-bottom: 24px;
//             border-radius: 8px;
//         }

//         #result {
//             margin-top: 24px;
//             white-space: pre-wrap;
//         }
//     </style>
// </head>

// <body>
//     <h1>Razorpay Test Payment</h1>

//     <div class="info">
//         <p><strong>Environment:</strong> Test Mode</p>
//         <p><strong>Amount:</strong> ₹2,499</p>
//         <p>
//             <strong>Order:</strong>
//             A fresh Razorpay order will be created
//         </p>
//     </div>

//     <button id="pay-button">
//         Create Order & Pay ₹2,499 (Test)
//     </button>

//     <div id="result"></div>

//     <script>
//         const result = document.getElementById("result");
//         const button = document.getElementById("pay-button");

//         button.onclick = async function () {
//             button.disabled = true;
//             result.textContent = "Creating Razorpay Test Order...";

//             try {
//                 const orderResponse = await fetch(
//                     "/test-payment/order",
//                     {
//                         method: "POST",
//                         headers: {
//                             "Content-Type": "application/json"
//                         }
//                     }
//                 );

//                 const orderData = await orderResponse.json();

//                 if (!orderResponse.ok) {
//                     throw new Error(
//                         orderData.error ||
//                         "Could not create Razorpay order"
//                     );
//                 }

//                 result.textContent =
//                     "Order created: " +
//                     orderData.orderId +
//                     "\\n\\nOpening Razorpay Checkout...";

//                 const options = {
//                     key: "${keyId}",
//                     amount: orderData.amount,
//                     currency: orderData.currency,
//                     name: "AI Finance Controller",
//                     description: "Razorpay Test Payment",
//                     order_id: orderData.orderId,

//                     handler: function (response) {
//                         result.textContent =
//                             "PAYMENT SUCCESSFUL\\n\\n" +
//                             "Payment ID: " +
//                             response.razorpay_payment_id +
//                             "\\n" +
//                             "Order ID: " +
//                             response.razorpay_order_id +
//                             "\\n" +
//                             "Signature: " +
//                             response.razorpay_signature;
//                     }
//                 };

//                 const razorpay = new Razorpay(options);

//                 razorpay.on(
//                     "payment.failed",
//                     function (response) {
//                         const error = response.error;

//                         result.textContent =
//                             "PAYMENT FAILED\\n\\n" +
//                             "Code: " +
//                             (error.code || "N/A") +
//                             "\\n" +
//                             "Description: " +
//                             (error.description || "N/A") +
//                             "\\n" +
//                             "Source: " +
//                             (error.source || "N/A") +
//                             "\\n" +
//                             "Step: " +
//                             (error.step || "N/A") +
//                             "\\n" +
//                             "Reason: " +
//                             (error.reason || "N/A");
//                     }
//                 );

//                 razorpay.open();
//             } catch (error) {
//                 result.textContent =
//                     "ERROR\\n\\n" +
//                     (error instanceof Error
//                         ? error.message
//                         : String(error));
//             } finally {
//                 button.disabled = false;
//             }
//         };
//     </script>
// </body>
// </html>
//     `);
// });


app.get("/test-payment", (_request, response) => {
    const keyId = process.env.RAZORPAY_KEY_ID;

    if (!keyId) {
        response.status(500).send(`
            <h1>Razorpay Test Payment Not Configured</h1>
            <p>RAZORPAY_KEY_ID is missing.</p>
        `);
        return;
    }

    response.type("html").send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    />

    <title>Razorpay Test Payment</title>

    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 60px auto;
            padding: 24px;
            background: #fafafa;
            color: #111827;
        }

        .card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 28px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }

        h1 {
            margin-top: 0;
            margin-bottom: 8px;
        }

        .subtitle {
            color: #6b7280;
            margin-bottom: 28px;
        }

        label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .amount-wrapper {
            position: relative;
            margin-bottom: 16px;
        }

        .currency {
            position: absolute;
            left: 14px;
            top: 13px;
            font-size: 16px;
            color: #6b7280;
        }

        input {
            width: 100%;
            padding: 12px 14px 12px 32px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 16px;
            outline: none;
        }

        input:focus {
            border-color: #111827;
            box-shadow: 0 0 0 2px rgba(17,24,39,0.08);
        }

        .presets {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }

        .preset {
            padding: 7px 12px;
            border: 1px solid #d1d5db;
            border-radius: 999px;
            background: white;
            cursor: pointer;
            font-size: 13px;
        }

        .preset:hover {
            background: #f3f4f6;
        }

        #pay-button {
            width: 100%;
            padding: 13px 20px;
            border: none;
            border-radius: 8px;
            background: #111827;
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }

        #pay-button:hover {
            background: #1f2937;
        }

        #pay-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .info {
            margin-top: 20px;
            padding: 14px;
            background: #f9fafb;
            border-radius: 8px;
            font-size: 13px;
            color: #6b7280;
        }

        #result {
            margin-top: 20px;
            padding: 14px;
            border-radius: 8px;
            background: #f3f4f6;
            white-space: pre-wrap;
            word-break: break-word;
            font-size: 13px;
        }

        .success {
            background: #ecfdf5 !important;
            color: #065f46;
        }

        .error {
            background: #fef2f2 !important;
            color: #991b1b;
        }
    </style>
</head>

<body>

<div class="card">

    <h1>Razorpay Test Payment</h1>

    <p class="subtitle">
        Create a Razorpay Test Mode payment with any amount.
    </p>

    <label for="amount">
        Payment Amount
    </label>

    <div class="amount-wrapper">
        <span class="currency">₹</span>
        <input
            id="amount"
            type="number"
            min="1"
            step="0.01"
            value="999"
            placeholder="Enter amount"
        />
    </div>

    <div class="presets">
        <button class="preset" type="button" data-amount="499">
            ₹499
        </button>

        <button class="preset" type="button" data-amount="999">
            ₹999
        </button>

        <button class="preset" type="button" data-amount="1499">
            ₹1,499
        </button>

        <button class="preset" type="button" data-amount="2499">
            ₹2,499
        </button>

        <button class="preset" type="button" data-amount="4999">
            ₹4,999
        </button>
    </div>

    <button id="pay-button">
        Create Order & Pay ₹999
    </button>

    <div class="info">
        <strong>Environment:</strong> Razorpay Test Mode
        <br />
        No real money will be charged.
    </div>

    <div id="result"></div>

</div>

<script>
    const result = document.getElementById("result");
    const button = document.getElementById("pay-button");
    const amountInput = document.getElementById("amount");

    function getAmount() {
        return Number(amountInput.value);
    }

    function updateButtonText() {
        const amount = getAmount();

        if (Number.isFinite(amount) && amount > 0) {
            button.textContent =
                "Create Order & Pay ₹" +
                amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
        } else {
            button.textContent = "Enter Amount";
        }
    }

    amountInput.addEventListener("input", updateButtonText);

    document.querySelectorAll(".preset").forEach(function (preset) {
        preset.addEventListener("click", function () {
            amountInput.value = preset.dataset.amount;
            updateButtonText();
        });
    });

    button.onclick = async function () {
        const amount = getAmount();

        if (!Number.isFinite(amount) || amount <= 0) {
            result.className = "error";
            result.textContent = "Please enter a valid amount.";
            return;
        }

        button.disabled = true;
        result.className = "";
        result.textContent =
            "Creating Razorpay Test Order for ₹" +
            amount.toLocaleString("en-IN") +
            "...";

        try {
            const orderResponse = await fetch(
                "/test-payment/order",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        amount
                    })
                }
            );

            const orderData = await orderResponse.json();

            if (!orderResponse.ok) {
                throw new Error(
                    orderData.error ||
                    "Could not create Razorpay order"
                );
            }

            result.textContent =
                "Order created: " +
                orderData.orderId +
                "\\n\\nOpening Razorpay Checkout...";

            const options = {
                key: "${keyId}",
                amount: orderData.amount,
                currency: orderData.currency,
                name: "AI Finance Controller",
                description: "Razorpay Test Payment",
                order_id: orderData.orderId,

                handler: function (paymentResponse) {
                    result.className = "success";

                    result.textContent =
                        "PAYMENT SUCCESSFUL\\n\\n" +
                        "Payment ID: " +
                        paymentResponse.razorpay_payment_id +
                        "\\n" +
                        "Order ID: " +
                        paymentResponse.razorpay_order_id +
                        "\\n" +
                        "Signature: " +
                        paymentResponse.razorpay_signature;
                }
            };

            const razorpay = new Razorpay(options);

            razorpay.on(
                "payment.failed",
                function (response) {
                    const error = response.error;

                    result.className = "error";

                    result.textContent =
                        "PAYMENT FAILED\\n\\n" +
                        "Code: " +
                        (error.code || "N/A") +
                        "\\n" +
                        "Description: " +
                        (error.description || "N/A") +
                        "\\n" +
                        "Source: " +
                        (error.source || "N/A") +
                        "\\n" +
                        "Step: " +
                        (error.step || "N/A") +
                        "\\n" +
                        "Reason: " +
                        (error.reason || "N/A");
                }
            );

            razorpay.open();

        } catch (error) {
            result.className = "error";

            result.textContent =
                "ERROR\\n\\n" +
                (
                    error instanceof Error
                        ? error.message
                        : String(error)
                );

        } finally {
            button.disabled = false;
        }
    };

    updateButtonText();
</script>

</body>
</html>
    `);
});

/*
 * Create a fresh Razorpay Test Mode order.
 *
 * IMPORTANT:
 * RAZORPAY_KEY_SECRET is used only here on the server.
 * It is never sent to the browser.
 */
app.post("/test-payment/order", async (_request, response) => {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            response.status(500).json({
                error:
                    "Razorpay Test Mode credentials are not configured",
            });
            return;
        }

        const client = new RazorpayClient({
            keyId,
            keySecret,
        });

        const order = await client.post<{
            id: string;
            entity: string;
            amount: number;
            currency: string;
            status: string;
        }>({
            path: "/orders",
            body: {
                amount: 199900,
                currency: "INR",
                receipt: `ai_finance_demo_${Date.now()}`,
                notes: {
                    demo: "true",
                    source: "ai-finance-controller",
                },
            },
        });

        response.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            status: order.status,
        });
    } catch (error) {
        console.error("Razorpay order creation failed:", error);

        response.status(502).json({
            error:
                error instanceof Error
                    ? error.message
                    : "Razorpay order creation failed",
        });
    }
});


app.get("/test-payment/payments", async (_request, response) => {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            response.status(500).json({
                error: "Razorpay credentials are not configured",
            });
            return;
        }

        const client = new RazorpayClient({
            keyId,
            keySecret,
        });

        const result = await client.get<{
            items: Array<{
                id: string;
                amount: number;
                currency: string;
                status: string;
                order_id?: string;
            }>;
        }>({
            path: "/payments",
            query: {
                count: 10,
            },
        });

        response.json({
            payments: result.items.map((payment) => ({
                id: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                orderId: payment.order_id ?? null,
            })),
        });
    } catch (error) {
        console.error(
            "Razorpay payment lookup failed:",
            error,
        );

        response.status(502).json({
            error:
                error instanceof Error
                    ? error.message
                    : "Razorpay payment lookup failed",
        });
    }
});

app.post("/test-payment/refund", async (request, response) => {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            response.status(500).json({
                error: "Razorpay credentials are not configured",
            });
            return;
        }

        const paymentId = request.body?.paymentId;
        const amount = request.body?.amount;

        if (
            typeof paymentId !== "string" ||
            !paymentId.trim()
        ) {
            response.status(400).json({
                error: "paymentId is required",
            });
            return;
        }

        if (
            typeof amount !== "number" ||
            !Number.isInteger(amount) ||
            amount <= 0
        ) {
            response.status(400).json({
                error:
                    "amount must be a positive integer in paise",
            });
            return;
        }

        const client = new RazorpayClient({
            keyId,
            keySecret,
        });

        const refund = await client.post<{
            id: string;
            entity: string;
            amount: number;
            currency: string;
            payment_id: string;
            status: string;
        }>({
            path: `/payments/${encodeURIComponent(paymentId)}/refund`,
            body: {
                amount,
                notes: {
                    demo: "true",
                    source: "ai-finance-controller",
                },
                receipt: `ai_finance_refund_${Date.now()}`,
            },
        });

        response.json({
            refundId: refund.id,
            paymentId: refund.payment_id,
            amount: refund.amount,
            currency: refund.currency,
            status: refund.status,
        });
    } catch (error) {
        console.error(
            "Razorpay refund creation failed:",
            error,
        );

        response.status(502).json({
            error:
                error instanceof Error
                    ? error.message
                    : "Razorpay refund creation failed",
        });
    }
});

app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/investigation", investigationRouter);

app.use(apiErrorHandler);

export default app;