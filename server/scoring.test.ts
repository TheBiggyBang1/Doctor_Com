import assert from "node:assert/strict";
import test from "node:test";
import { calculateLeadScore } from "./scoring.js";
import type { QuestionnaireAnswers } from "./validation.js";

function answers(size: string, amountBand: string, urgency: string, sector = "crafts") {
  return {
    company: { size, sector },
    budget: { amountBand, urgency },
  } as QuestionnaireAnswers;
}

test("scores a low-budget, non-urgent self-employed lead as category C", () => {
  assert.deepEqual(calculateLeadScore(answers("self-employed", "low", "not-urgent")), {
    budgetScore: 10,
    urgencyScore: 10,
    companyScore: 10,
    total: 30,
    category: "C",
  });
});

test("scores a medium-budget SME with a three-month timeline as category B", () => {
  const score = calculateLeadScore(answers("sme", "medium", "three-months"));
  assert.equal(score.total, 66);
  assert.equal(score.category, "B");
});

test("scores a high-budget, urgent large company as category A", () => {
  const score = calculateLeadScore(answers("enterprise", "high", "one-month"));
  assert.equal(score.total, 100);
  assert.equal(score.category, "A");
});

test("a configured high-value sector receives 34 company points", () => {
  const score = calculateLeadScore(answers("tpe", "low", "not-urgent", "finance"), new Set(["finance"]));
  assert.equal(score.companyScore, 34);
  assert.equal(score.total, 54);
  assert.equal(score.category, "B");
});