import test from "node:test";
import assert from "node:assert/strict";
import { calculateAssignments, sortAssignmentIndexes } from "../calculator.mjs";
import { createPlanner } from "../planner.mjs";
import { masters } from "../tasks.mjs";

const [turael, spria] = masters;

test("shared Sourhogs block uses a slot without changing Turael's odds", () => {
  const planner = createPlanner(masters);
  assert.equal(planner.blockSlots, 7);
  assert.equal(planner.setBlockSlots(1), true);
  planner.setBlocked(turael.id, "Sourhogs", true);
  planner.setBlocked(spria.id, "Cows", true);
  assert.deepEqual([...planner.blocked(spria.id)], ["Sourhogs"]);
  assert.equal(planner.blocked("konar").size, 0);
  for (const [master, expectedWeight] of [[turael, 172], [spria, 172]]) {
    const flags = master.tasks.map(({ name }) => ({ blocked: planner.blocked(master.id).has(name) }));
    assert.equal(calculateAssignments(master.tasks, flags).totalWeight, expectedWeight);
  }
  assert.equal(planner.setBlockSlots(0), false);
  planner.setBlocked(spria.id, "Sourhogs", false);
  assert.equal(planner.blocked(turael.id).size, 0);
  assert.equal(planner.setBlockSlots(12), true);
});

test("legacy cookies merge blocks, keep per-master preferences, and preserve occupied slots", () => {
  const config = {
    version: 1,
    master: spria.id,
    choices: {
      [turael.id]: "3".repeat(8) + "0".repeat(16),
      [spria.id]: spria.tasks.map(({ name }) => name === "Sourhogs" ? "2" : "0").join(""),
    },
  };
  const planner = createPlanner(masters, config);
  assert.equal(planner.initialMaster, 1);
  assert.equal(planner.blockSlots, 9);
  assert.equal(planner.blocked(turael.id).has("Sourhogs"), true);
  assert.equal(planner.preferred.get(turael.id).size, 8);
  assert.equal(planner.preferred.get(spria.id).size, 0);
  const restored = createPlanner(masters, planner.configuration(1));
  assert.deepEqual(restored.blocked(spria.id), planner.blocked(spria.id));
  assert.equal(restored.blockSlots, 9);
});

test("sorting handles numeric ranges, odds, and empty cells in both directions", () => {
  const tasks = [
    { amount: "100-200", extendedAmount: "150-200", odds: 0.09 },
    { amount: "15-25", odds: 0.21 },
    { amount: "15-20", extendedAmount: "30-50", odds: 0 },
  ];
  assert.deepEqual(sortAssignmentIndexes(tasks, "amount", "ascending"), [2, 1, 0]);
  assert.deepEqual(sortAssignmentIndexes(tasks, "extendedAmount", "descending"), [0, 2, 1]);
  assert.deepEqual(sortAssignmentIndexes(tasks, "odds", "descending"), [1, 0, 2]);
});
