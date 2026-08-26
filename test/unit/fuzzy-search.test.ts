import { describe, expect, it } from "vitest";

import { searchFuzzyCandidates } from "../../src/reconciliation/retrieval/fuzzy-search.js";

describe("fuzzy candidate search", () => {
    it("retrieves a vendor with a typo", () => {
        const results = searchFuzzyCandidates(
            {
                vendor: "Acme Corpp",
            },
            [
                {
                    id: "1",
                    vendor: "Acme Corp",
                    reference: "INV-001",
                },
                {
                    id: "2",
                    vendor: "Globex Inc",
                    reference: "INV-002",
                },
            ],
        );

        expect(results.some((result) => result.id === "1")).toBe(true);
    });

    it("retrieves a vendor with a minor abbreviation variation", () => {
        const results = searchFuzzyCandidates(
            {
                vendor: "Acme Corp",
            },
            [
                {
                    id: "1",
                    vendor: "Acme Corporation",
                    reference: "INV-001",
                },
                {
                    id: "2",
                    vendor: "Globex Inc",
                    reference: "INV-002",
                },
            ],
        );

        expect(results.some((result) => result.id === "1")).toBe(true);
    });

    it("retrieves a vendor with punctuation changes", () => {
        const results = searchFuzzyCandidates(
            {
                vendor: "Acme Corp",
            },
            [
                {
                    id: "1",
                    vendor: "Acme, Corp.",
                    reference: "INV-001",
                },
                {
                    id: "2",
                    vendor: "Globex Inc.",
                    reference: "INV-002",
                },
            ],
        );

        expect(results.some((result) => result.id === "1")).toBe(true);
    });

    it("retrieves candidates using reference similarity", () => {
        const results = searchFuzzyCandidates(
            {
                vendor: "Unknown Vendor",
                reference: "INV-0012",
            },
            [
                {
                    id: "1",
                    vendor: "Acme Corp",
                    reference: "INV-001",
                },
                {
                    id: "2",
                    vendor: "Globex Inc",
                    reference: "INV-999",
                },
            ],
        );

        expect(results.some((result) => result.id === "1")).toBe(true);
    });

    it("returns better fuzzy matches before worse matches", () => {
        const results = searchFuzzyCandidates(
            {
                vendor: "Acme Corp",
            },
            [
                {
                    id: "1",
                    vendor: "Acme Corporation",
                    reference: "INV-001",
                },
                {
                    id: "2",
                    vendor: "Completely Different Vendor",
                    reference: "INV-999",
                },
            ],
        );

        expect(results[0]?.id).toBe("1");
    });
});