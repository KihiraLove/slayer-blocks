export function calculateAssignments(tasks, flags = []) {
  const assignments = tasks.map((task, index) => {
    const { unmet = false, preferred = false, blocked = false } = flags[index] ?? {};
    return { ...task, unmet, preferred, blocked, finalWeight: unmet || blocked ? 0 : task.weight };
  });
  const totalWeight = assignments.reduce((total, task) => total + task.finalWeight, 0);
  for (const task of assignments) {
    task.odds = totalWeight === 0 ? 0 : task.finalWeight / totalWeight;
  }

  const byWeight = [...assignments].sort((left, right) => right.weight - left.weight);
  const recommended = byWeight.filter((task) => !task.unmet && !task.preferred);
  const preferred = byWeight.filter((task) => task.preferred);
  return {
    assignments,
    totalWeight,
    recommended,
    preferred,
    preferredChance: preferred.reduce((total, task) => total + task.odds, 0),
  };
}
const assignmentTextOrder = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function sortAssignmentIndexes(assignments, column, direction) {
  return assignments.map((_, index) => index).sort((leftIndex, rightIndex) => {
    const left = assignments[leftIndex][column];
    const right = assignments[rightIndex][column];
    if (left == null || right == null) return Number(left == null) - Number(right == null);
    const order = typeof left === "string" ? assignmentTextOrder.compare(left, right) : left - right;
    return direction === "descending" ? -order : order;
  });
}
