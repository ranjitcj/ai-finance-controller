import "dotenv/config";

import { GeminiInvestigationModel } from "../src/investigation/providers/gemini/gemini-investigation-model.js";
import { runBoundedInvestigation } from "../src/investigation/agent/bounded-agent.js";

const paymentExternalId = "pay_TYEdsK0qKJIZvG";

const model = new GeminiInvestigationModel();

const result = await runBoundedInvestigation(
    model,
    {
        task: "Investigate this Razorpay payment and its refund status.",
        paymentExternalId,
    },
    {
        maxIterations: 3,
        timeoutMs: 15_000,
    },
);

console.log(
    JSON.stringify(
        {
            status: result.status,
            iterations: result.iterations,
            observations: result.observations,
            output: result.output,
        },
        null,
        2,
    ),
);