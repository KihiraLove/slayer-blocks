import test from "node:test";
import assert from "node:assert/strict";
import { calculateAssignments } from "../calculator.mjs";
import { masters } from "../tasks.mjs";

test("all workbook tabs start with their full assignment pool and zero preferred odds", () => {
  const expected = [172, 178, 196, 219, 333, 360, 250, 294, 327];
  assert.equal(masters.reduce((count, master) => count + master.tasks.length, 0), 330);
  assert.deepEqual(masters.map(({ tasks }) => {
    const result = calculateAssignments(tasks);
    assert.equal(result.preferredChance, 0);
    assert.ok(result.assignments.every(({ unmet, preferred, blocked }) => !unmet && !preferred && !blocked));
    assert.ok(Math.abs(result.assignments.reduce((total, task) => total + task.odds, 0) - 1) < 1e-12);
    return result.totalWeight;
  }), expected);
});

test("unmet and blocked tasks contribute no weight and recommendations retain blocked rows", () => {
  const tasks = [
    { name: "Locked", weight: 9 },
    { name: "Blocked", weight: 8 },
    { name: "Preferred", weight: 7 },
    { name: "Other", weight: 5 },
    { name: "Also preferred", weight: 3 },
  ];
  const flags = [
    { unmet: true },
    { blocked: true },
    { preferred: true },
    {},
    { preferred: true, blocked: true },
  ];
  const result = calculateAssignments(tasks, flags);
  assert.equal(result.totalWeight, 12);
  assert.equal(result.preferredChance, 7 / 12);
  assert.deepEqual(result.assignments.map((task) => task.finalWeight), [0, 0, 7, 5, 0]);
  assert.deepEqual(result.recommended.map((task) => task.name), ["Blocked", "Other"]);
  assert.deepEqual(result.preferred.map((task) => task.odds), [7 / 12, 0]);
});

test("an empty assignment pool shows zero odds", () => {
  const result = calculateAssignments([{ name: "Only task", weight: 7 }], [{ blocked: true, preferred: true }]);
  assert.equal(result.totalWeight, 0);
  assert.equal(result.assignments[0].odds, 0);
  assert.equal(result.preferredChance, 0);
});