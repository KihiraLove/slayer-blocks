import test from "node:test";
import assert from "node:assert/strict";
import { STOP_THE_WYVERN, calculateAssignments } from "../calculator.mjs";
import { masters } from "../tasks.mjs";

test("all workbook tabs start with only available tasks and zero preferred odds", () => {
  const expected = [172, 178, 161, 219, 333, 323, 210, 227, 244];
  assert.equal(masters.reduce((count, master) => count + master.tasks.length, 0), 330);
  assert.deepEqual(masters.map(({ tasks }) => {
    const result = calculateAssignments(tasks);
    assert.equal(result.preferredChance, 0);
    assert.ok(result.assignments.every(({ requirementChecked, preferred, blocked }) => !requirementChecked && !preferred && !blocked));
    assert.ok(Math.abs(result.assignments.reduce((total, task) => total + task.odds, 0) - 1) < 1e-12);
    return result.totalWeight;
  }), expected);
});

test("unmet and blocked tasks contribute no weight and recommendations retain blocked rows", () => {
  const tasks = [
    { name: "Locked", requirement: "Unlock A", weight: 9 },
    { name: "Blocked", weight: 8 },
    { name: "Preferred", requirement: "Unlock B", weight: 7 },
    { name: "Other", weight: 5 },
    { name: "Also preferred", weight: 3 },
  ];
  const flags = [
    {},
    { blocked: true },
    { requirementChecked: true, preferred: true },
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
test("Stop the wyvern excludes its task without marking it as a paid block", () => {
  const tasks = [{ name: "Wyverns", requirement: STOP_THE_WYVERN, weight: 7 }, { name: "Other", weight: 5 }];
  assert.equal(calculateAssignments(tasks).totalWeight, 12);
  const result = calculateAssignments(tasks, [{ requirementChecked: true }]);
  assert.equal(result.totalWeight, 5);
  assert.equal(result.assignments[0].odds, 0);
  assert.equal(result.assignments[0].blocked, false);
  assert.deepEqual(result.recommended.map((task) => task.name), ["Other"]);
});

test("a shared block-only row has zero odds and stays out of recommendations", () => {
  const tasks = [{ name: "Cows", weight: 8 }, { name: "Sourhogs", weight: 0 }];
  for (const blocked of [false, true]) {
    const result = calculateAssignments(tasks, [{}, { blocked }]);
    assert.deepEqual(result.assignments.map((task) => task.odds), [1, 0]);
    assert.deepEqual(result.recommended.map((task) => task.name), ["Cows"]);
  }
});
