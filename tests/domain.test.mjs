import test from "node:test";
import assert from "node:assert/strict";
import {
  nightsBetween,
  splitMeal,
  balances,
  budgetAmount,
} from "../src/domain.js";
test("trip nights and invalid order", () => {
  assert.equal(nightsBetween("2026-11-28", "2026-12-01"), 3);
  assert.equal(nightsBetween("2026-12-01", "2026-11-28"), 0);
});
test("meal conserves cents with unequal rounding", () => {
  const e = splitMeal("100", "0", "0", ["A", "B", "C"], "A");
  assert.deepEqual(
    e.shares.map((x) => x.amount),
    [3334, 3333, 3333],
  );
  assert.equal(
    e.shares.reduce((s, p) => s + p.amount, 0),
    e.total,
  );
});
test("fees and selected participants", () => {
  const e = splitMeal("600", "10", "0", ["A", "C"], "B");
  assert.equal(e.total, 66000);
  assert.deepEqual(
    e.shares.map((x) => x.amount),
    [33000, 33000],
  );
  assert.equal(
    balances([e]).reduce((s, t) => s + t.amount, 0),
    66000,
  );
});
test("reject invalid inputs", () => {
  assert.throws(() => splitMeal("-5", "0", "0", ["A"], "A"));
  assert.throws(() => splitMeal("10", "0", "11", ["A"], "A"));
  assert.throws(() => splitMeal("10", "0", "0", [], "A"));
  assert.throws(() => splitMeal("10", "101", "0", ["A"], "A"));
});
test("partial repayment reduces debt rather than adding expense", () => {
  const e = splitMeal("600", "10", "0", ["A", "B", "C"], "A");
  const paid = {
    payer: "B",
    total: 10000,
    shares: [{ name: "A", amount: 10000 }],
  };
  assert.equal(balances([e, paid]).find((t) => t.from === "B").amount, 12000);
});
test("budget units consider rooms guests nights", () => {
  assert.equal(budgetAmount(600, "trip", 3, 3, 2), 3600);
  assert.equal(budgetAmount(600, "person", 3, 3, 2), 400);
  assert.equal(budgetAmount(600, "room", 3, 3, 2), 600);
});
