export interface InvestigationToolCall {
  toolName: string;
  input: unknown;
}

export interface InvestigationToolResult {
  toolName: string;
  output: unknown;
}

export interface InvestigationModel {
  decide(
    context: InvestigationModelContext,
  ): Promise<InvestigationModelDecision>;
}

export interface InvestigationModelContext {
  originalInput: unknown;
  observations: InvestigationToolResult[];
  iteration: number;
}

export type InvestigationModelDecision =
  | {
      type: "TOOL_CALL";
      call: InvestigationToolCall;
    }
  | {
      type: "FINAL";
      output: unknown;
    };

export interface BoundedAgentOptions {
  maxIterations: number;
  timeoutMs: number;
}

export interface BoundedAgentResult {
  status:
    | "COMPLETED"
    | "MAX_ITERATIONS"
    | "TIMEOUT";
  output: unknown;
  observations: InvestigationToolResult[];
  iterations: number;
}