# Razorpay AI Finance Controller

> An AI-assisted financial reconciliation platform that combines deterministic financial controls with bounded AI investigation.

## Table of Contents

- [Overview](#overview)
- [Problem](#problem)
- [Solution](#solution)
- [Core Design Principle](#core-design-principle)
- [Architecture](#architecture)
- [End-to-End Reconciliation Flow](#end-to-end-reconciliation-flow)
- [Razorpay Integration](#razorpay-integration)
- [Razorpay Ingestion](#razorpay-ingestion)
- [Money Handling](#money-handling)
- [Reconciliation Engine](#reconciliation-engine)
- [Decision Policy](#decision-policy)
- [AI Investigation](#ai-investigation)
- [Bounded Agent](#bounded-agent)
- [Investigation Tools](#investigation-tools)
- [Evidence](#evidence)
- [Auditability](#auditability)
- [Idempotency](#idempotency)
- [Transaction State Management](#transaction-state-management)
- [Database](#database)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Backend](#running-the-backend)
- [Running the Frontend](#running-the-frontend)
- [API Endpoints](#api-endpoints)
- [Frontend](#frontend)
- [Synthetic Demo Dataset](#synthetic-demo-dataset)
- [Testing](#testing)
- [Test Coverage](#test-coverage)
- [Current Validation](#current-validation)
- [Security and Financial Control Model](#security-and-financial-control-model)
- [Production Roadmap](#production-roadmap)
- [Demo Story](#demo-story)
- [Why This Architecture?](#why-this-architecture)
- [Project Philosophy](#project-philosophy)
- [License](#license)

---

## Overview

Razorpay AI Finance Controller is a finance operations platform designed to reconcile payment and settlement data from Razorpay.

The system is built around a simple principle:

> **AI investigates. Deterministic policy decides.**

Instead of allowing an AI model to directly make financial decisions, the platform uses deterministic reconciliation rules and a Decision Policy as the financial source of truth. AI is introduced only when a transaction requires further investigation.

The platform provides:

- Razorpay API ingestion
- Payment and settlement reconciliation
- Deterministic candidate retrieval
- Financial validation rules
- Decision Policy
- Evidence generation
- Exception management
- Audit trails
- Bounded AI investigation
- OpenAI and Gemini model support
- PostgreSQL persistence
- REST APIs
- Finance operations dashboard

---

## Problem

Financial reconciliation is more than comparing two transaction amounts.

A finance team may need to determine:

- Whether an order has a corresponding payment
- Whether the payment amount is correct
- Whether currency matches
- Whether transaction dates are consistent
- Whether a transaction is duplicated
- Whether a payment was refunded
- Whether a payment was included in a settlement
- Whether a settlement amount is correct
- Why a transaction failed reconciliation
- What evidence supports a reconciliation decision

Traditional rule-based reconciliation can identify many straightforward cases, but ambiguous cases often require investigation.

The challenge is therefore to combine:

1. Reliable deterministic financial controls
2. Traceable evidence
3. AI-assisted investigation
4. Human-reviewable outcomes

without allowing AI to directly control financial state.

---

## Solution

The Finance Controller uses a layered reconciliation architecture.

```text
                 Razorpay
                    │
                    ▼
            Razorpay API
                    │
                    ▼
        Ingestion & Validation
                    │
                    ▼
              PostgreSQL
                    │
                    ▼
        Candidate Retrieval
                    │
                    ▼
      Deterministic Reconciliation
                    │
                    ▼
            Decision Policy
             /     |      \
            /      |       \
       MATCHED  NO_MATCH  REVIEW
                              │
                              ▼
                    Bounded AI Investigator
                              │
                              ▼
                    Investigation Evidence
                              │
                              ▼
                     Decision Policy
                              │
                              ▼
                    Final Reconciliation
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
                Evidence              Audit
```

---

## Core Design Principle

### AI investigates. Policy decides.

The AI investigator is deliberately separated from the financial decision layer.

**AI can:**

- Investigate ambiguous transactions
- Inspect approved financial evidence
- Call controlled investigation tools
- Identify relationships between Razorpay entities
- Explain potential causes
- Produce structured investigation observations

**AI cannot:**

- Directly mark transactions as matched
- Directly mark transactions as reconciled
- Issue refunds
- Modify settlements
- Mutate financial records
- Bypass the Decision Policy
- Override deterministic financial controls

This keeps financial authority deterministic while still using AI where reasoning is valuable.

---

## Architecture

The application is implemented as a modular monolith.

```text
┌───────────────────────────────────────────────────────────┐
│                     Frontend                               │
│                                                             │
│ Dashboard | Reconciliation | Investigation | Audit         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────┐
│                       API Layer                            │
│                                                             │
│ Routes | Controllers | Validation | Services                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────┐
│                  Reconciliation Layer                       │
│                                                             │
│ Candidate Retrieval                                         │
│ Deterministic Rules                                         │
│ Razorpay Reconciliation                                      │
│ Decision Policy                                              │
│ Evidence                                                     │
│ State Management                                             │
└───────────────┬───────────────────────────┬─────────────────┘
                │                           │
                ▼                           ▼
┌──────────────────────────┐     ┌──────────────────────────┐
│      Investigation        │     │       PostgreSQL          │
│                           │     │                           │
│ Bounded Agent              │     │ Transactions              │
│ Tool Registry              │     │ Razorpay Records          │
│ Tool Validation             │     │ Candidates                │
│ Timeout Protection          │     │ Evidence                  │
│ Policy Guard                │     │ Results                   │
│ OpenAI / Gemini              │     │ Exceptions                │
└──────────────────────────┘     │ Audit Events               │
                                 └──────────────────────────┘
```

---

## End-to-End Reconciliation Flow

```text
1. Select reconciliation date range
              ↓
2. Fetch Razorpay data
              ↓
3. Validate API responses
              ↓
4. Normalize Razorpay records
              ↓
5. Persist records in PostgreSQL
              ↓
6. Create reconciliation batch
              ↓
7. Retrieve candidates
              ↓
8. Apply deterministic rules
              ↓
9. Generate financial evidence
              ↓
10. Apply Decision Policy
              ↓
11. MATCHED / NO_MATCH
              │
              └── REVIEW_REQUIRED
                       ↓
                AI Investigation
                       ↓
                Investigation Evidence
                       ↓
                Existing Decision Policy
                       ↓
                  Final Result
                       ↓
                Audit + Exceptions
```

---

## Razorpay Integration

Razorpay is treated as the source financial system.

The application fetches Razorpay data and maintains a normalized local representation in PostgreSQL.

The application does not write reconciliation decisions back to Razorpay.

### Supported Razorpay Entities

The data model supports:

- Orders
- Payments
- Refunds
- Settlements
- Settlement reconciliation records

### Razorpay Relationship Graph

```text
Order
 │
 └── Payment
       │
       └── Refund

Payment
 │
 └── Settlement
       │
       └── Settlement Reconciliation
```

This relationship graph is used by Razorpay-specific reconciliation and investigation tools.

---

## Razorpay Ingestion

Razorpay ingestion is implemented under:

```text
src/ingestion/razorpay/
```

Important components include:

```text
razorpay.client.ts
razorpay.ingestion.ts
razorpay.mapper.ts
razorpay.pagination.ts
razorpay.schemas.ts
razorpay.types.ts
```

### Responsibilities

**API Client** — Handles communication with Razorpay APIs.

**Pagination** — Handles collection endpoints that return multiple pages.

**Schemas** — Validates incoming Razorpay API objects.

**Mapper** — Converts Razorpay objects into normalized application data.

**Ingestion Service** — Coordinates fetching, validation, normalization and persistence.

---

## Money Handling

Razorpay amounts are represented in paise.

The ingestion layer converts amounts into decimal monetary values.

Example:

```text
99900 paise
     ↓
₹999.00
```

Financial values are stored using PostgreSQL numeric precision rather than JavaScript floating-point arithmetic for persisted monetary amounts.

---

## Reconciliation Engine

The reconciliation engine is located under:

```text
src/reconciliation/
```

It is divided into several responsibilities.

### Candidate Retrieval

Candidate retrieval identifies records that may correspond to a source transaction.

The system supports:

- Exact retrieval
- Fuzzy retrieval for the generic/legacy reconciliation path
- Razorpay-native candidate retrieval

Candidate retrieval itself is deterministic. AI is not used to discover arbitrary financial matches.

### Deterministic Rules

The reconciliation engine evaluates financial attributes using deterministic rules.

Examples include:

- Amount
- Currency
- Date
- Reference
- Duplicate detection

These rules produce structured evidence that can be consumed by the Decision Policy.

---

## Decision Policy

The Decision Policy is the authoritative financial decision layer.

Location:

```text
src/reconciliation/policy/decision-policy.ts
```

Representative outcomes include:

| Condition                       | Decision          |
|----------------------------------|--------------------|
| Exact reference match            | `MATCHED`          |
| Exact amount + currency + date   | `MATCHED`          |
| Amount mismatch                  | `NO_MATCH`         |
| Currency mismatch                | `NO_MATCH`         |
| Duplicate candidate              | `REVIEW_REQUIRED`  |
| Date within tolerance            | `REVIEW_REQUIRED`  |
| Reference mismatch               | `REVIEW_REQUIRED`  |
| Insufficient evidence            | `REVIEW_REQUIRED`  |

The policy also produces reason codes and confidence information used by the application.

---

## AI Investigation

AI is used when deterministic reconciliation identifies an ambiguous case.

The investigation system is located under:

```text
src/investigation/
```

### Investigation Architecture

```text
REVIEW_REQUIRED
       │
       ▼
Bounded Agent
       │
       ├── Tool Registry
       ├── Tool Validation
       ├── Timeout Protection
       └── Policy Guard
       │
       ▼
Investigation Model
       │
       ├── OpenAI
       └── Gemini
       │
       ▼
Structured Investigation Observation
       │
       ▼
Existing Decision Policy
       │
       ▼
Final Result
```

---

## Bounded Agent

The agent is intentionally constrained.

The bounded-agent architecture ensures that an investigation cannot become an unrestricted autonomous financial workflow.

Controls include:

- Tool allowlisting
- Input validation
- Output validation
- Timeout protection
- Policy guards
- Structured model output

---

## Investigation Tools

Razorpay-specific investigation tools are located under:

```text
src/investigation/tools/razorpay/
```

They can investigate:

- Payment/refund relationships
- Settlement relationships
- Settlement reconciliation
- Financial evidence
- Razorpay transaction relationships

The tools expose controlled information to the investigator rather than granting unrestricted database or financial-system access.

---

## Evidence

Evidence is a first-class concept in the system.

A reconciliation result can contain field-level evidence such as:

```text
Field:        amount
Source:       999.00
Candidate:    999.00
Explanation:  Amount matches exactly.
```

Other evidence may include:

- Currency comparison
- Date comparison
- Reference comparison
- Candidate score
- Payment relationship
- Refund relationship
- Settlement relationship
- Investigation observations

This makes the final decision explainable.

---

## Auditability

The system maintains an audit trail for reconciliation operations.

The database includes concepts for:

- Reconciliation results
- Candidates
- Evidence
- Exceptions
- Audit events

The result can therefore be traced through:

```text
Source Transaction → Candidate → Rule Evaluation → Evidence
    → AI Investigation → Decision Policy → Final Result → Audit Event
```

---

## Idempotency

Reconciliation runs are designed to be idempotent.

The reconciliation result includes an idempotency key and uniqueness constraints to prevent duplicate reconciliation results from being created for the same transaction.

This is important for financial workflows where jobs may be retried.

---

## Transaction State Management

Transactions move through controlled states.

Representative states include:

```text
PENDING → CANDIDATES_FOUND → INVESTIGATING → MATCHED / NO_MATCH / REVIEW_REQUIRED
```

Failures are represented explicitly through a `FAILED` state. This prevents uncontrolled state transitions.

---

## Database

PostgreSQL is used as the primary database.

The application uses:

- PostgreSQL
- Drizzle ORM
- Relational constraints
- Foreign keys
- Unique indexes
- Numeric monetary fields
- Database transactions

### Why PostgreSQL?

The system requires strong relational consistency across:

```text
Batches, Source Files, Transactions, Orders, Payments, Refunds,
Settlements, Settlement Reconciliation, Candidates, Evidence,
Results, Exceptions, Audit Events
```

PostgreSQL is therefore a better fit than a lightweight local-only database for the architecture being demonstrated.

---

## Project Structure

```text
ai-finance-controller/
│
├── src/
│   │
│   ├── api/
│   │   ├── contracts/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── validation.ts
│   │
│   ├── db/
│   │   ├── repositories/
│   │   ├── schema/
│   │   ├── migrations/
│   │   ├── client.ts
│   │   └── seed.ts
│   │
│   ├── domain/
│   │
│   ├── ingestion/
│   │   ├── csv/
│   │   └── razorpay/
│   │
│   ├── investigation/
│   │   ├── agent/
│   │   ├── providers/
│   │   │   ├── openai/
│   │   │   └── gemini/
│   │   └── tools/
│   │       └── razorpay/
│   │
│   └── reconciliation/
│       ├── metrics/
│       ├── policy/
│       ├── razorpay/
│       ├── retrieval/
│       ├── rules/
│       └── state/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── types/
│
├── test/
│   ├── unit/
│   └── integration/
│
├── drizzle.config.ts
├── eslint.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

## Tech Stack

**Backend**
- Node.js
- TypeScript
- Express
- Zod
- Drizzle ORM
- PostgreSQL

**Frontend**
- Next.js
- React
- TypeScript
- Tailwind CSS

**AI**
- OpenAI
- Gemini

**Testing**
- Vitest
- Unit testing
- Integration testing
- API end-to-end testing

---

## Getting Started

### Prerequisites

Install:

- Node.js
- npm
- PostgreSQL
- Razorpay Test Mode credentials

### Install Dependencies

From the project root:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

---

## Environment Configuration

Create your local environment configuration.

Example:

```env
DATABASE_URL=your_postgresql_connection_string

RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret

OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

Use Razorpay Test Mode credentials for development and the buildathon demo.

Never commit secrets to Git. Recommended files that should remain untracked:

```text
.env
.env.local
```

Use `.env.example` for documenting required variables without exposing credentials.

---

## Database Setup

Generate migrations:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

Seed demonstration data:

```bash
npm run db:seed
```

---

## Running the Backend

Start the development server:

```bash
npm run dev
```

The backend runs on `http://localhost:5000`.

---

## Running the Frontend

Start the Next.js application:

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:3000`.

---

## API Endpoints

### Synchronize Razorpay Data

```http
POST /api/reconciliation/sync
```

Example body:

```json
{
  "from": "2025-09-01",
  "to": "2025-09-30"
}
```

Synchronizes Razorpay records for the selected date range.

### Run Reconciliation

```http
POST /api/reconciliation/:batchId/run
```

Runs reconciliation for the selected batch.

### Reconciliation Status

```http
GET /api/reconciliation/:id/status
```

Returns the current reconciliation status.

### Reconciliation Results

```http
GET /api/reconciliation/:id/results
```

Returns reconciliation results.

### Exceptions

```http
GET /api/reconciliation/:id/exceptions
```

Returns reconciliation exceptions requiring attention.

### Audit

```http
GET /api/reconciliation/:id/audit
```

Returns the audit trail for the reconciliation batch.

---

## Frontend

The frontend provides a finance operations interface.

**Dashboard**
- Reconciliation overview
- Batch status
- Exception visibility
- Recent audit activity
- Razorpay synchronization

**Reconciliation**
- Batch status
- Transaction results
- Match status
- Exceptions
- Evidence

**Investigation**
- Review-required transactions
- Investigation status
- Investigation observations
- Supporting evidence

**Audit**
- Operational history and traceability

**Razorpay Test Payment**
- A Razorpay Test Mode payment flow for demonstrating real Razorpay test transactions

---

## Synthetic Demo Dataset

The project includes a synthetic seed dataset for testing reconciliation behavior.

The seed creates 300 transactions across multiple scenarios:

| Range     | Scenario           |
|-----------|--------------------|
| 1–210     | Exact Match        |
| 211–240   | Amount Mismatch    |
| 241–255   | Missing Payment    |
| 256–270   | Refund             |
| 271–285   | Settlement Mismatch|
| 286–300   | Duplicate          |

This dataset is intended for regression testing, reconciliation demonstrations, edge-case testing, and stress testing.

It should not be represented as real merchant production data. Razorpay Test Mode data and synthetic seeded data are separate sources.

---

## Testing

Run the complete test suite:

```bash
npm run test
```

Run TypeScript validation:

```bash
npm run typecheck
```

Run ESLint:

```bash
npm run lint
```

Build the application:

```bash
npm run build
```

---

## Test Coverage

The test suite includes coverage for:

- Transaction persistence
- Database behavior
- Exact candidate retrieval
- Razorpay candidate retrieval
- Reconciliation service
- Reconciliation orchestration
- Reconciliation API
- Exception persistence
- Audit persistence
- Decision Policy
- Decision Policy boundaries
- Deterministic engine
- Amount rule
- Currency rule
- Date rule
- Reference rule
- Duplicate rule
- Transaction state machine
- Razorpay schemas
- Razorpay mapper
- Razorpay pagination
- Razorpay client
- Razorpay reconciliation
- Payment/refund reconciliation
- Payment/settlement reconciliation
- Settlement reconciliation
- Investigation tools
- Investigation policy
- Bounded agent
- Tool validation
- Investigation timeout
- OpenAI provider
- Gemini provider
- CSV ingestion
- Fuzzy search
- Financial evidence

---

## Current Validation

At the current development checkpoint:

```text
Test Files: 55 passed
Tests:      247 passed
TypeScript: PASS
```

The repository is being finalized for the buildathon presentation.

---

## Security and Financial Control Model

The project deliberately separates:

```text
Reasoning ≠ Financial Authority
```

AI provides reasoning and investigation assistance. Deterministic code provides financial authority.

This separation reduces the risk of:

- Hallucinated financial decisions
- Unauthorized mutations
- Untraceable decisions
- Uncontrolled agent behavior
- AI bypassing business rules

---

## Production Roadmap

The buildathon implementation can be extended toward production with:

**Authentication and Authorization**
- User authentication
- Role-based access control
- Finance approval workflows

**Razorpay Integration**
- Production credentials
- Webhook ingestion
- Signature verification
- Incremental synchronization
- Retry and recovery workflows

**Infrastructure**
- Background reconciliation workers
- Queue-based processing
- Distributed locking
- Observability
- Metrics
- Alerting

**Financial Controls**
- Immutable audit storage
- Reconciliation period locking
- Approval workflows
- Stronger accounting controls

**AI Governance**
- Model/version tracking
- Prompt versioning
- Investigation replay
- Model cost controls
- Human escalation
- Additional output validation

---

## Demo Story

The recommended buildathon demo:

1. **Start with Razorpay** — Show that Razorpay is the source system.
2. **Synchronize** — Select a date range and synchronize Razorpay data.
3. **Reconcile** — Run reconciliation and show `MATCHED` / `NO_MATCH` / `REVIEW_REQUIRED`.
4. **Open an Exception** — Select a review-required case and show the underlying evidence.
5. **Investigate with AI** — Demonstrate that the investigator can inspect approved Razorpay financial relationships.
6. **Explain the Control Boundary** — Show the flow: AI Investigation → Evidence → Decision Policy → Final Financial Result.
7. **Show Auditability** — Finish by showing the evidence and audit trail behind the result.

Key message:

> The AI does not decide where money goes. It investigates why a case is ambiguous, while deterministic policy remains the financial authority.

---

## Why This Architecture?

A financial system should not depend on probabilistic reasoning at the point where financial authority is exercised.

The architecture therefore combines:

- Deterministic rules
- Deterministic decision policy
- Controlled AI investigation
- Evidence
- Auditability

This provides the benefits of AI without turning the AI model into an uncontrolled financial decision-maker.

---

## Project Philosophy

> **Use deterministic systems for financial authority and AI for investigation.**

The goal is not to replace finance controls with an AI model. The goal is to build a finance controller that can:

- Reconcile reliably
- Explain its decisions
- Investigate ambiguous cases
- Preserve evidence
- Maintain auditability
- Scale toward production workflows

while keeping the final financial authority deterministic.

---

## License

This project was created as a buildathon prototype. It is provided for demonstration and evaluation purposes.