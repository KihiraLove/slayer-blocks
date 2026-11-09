export const recommendedBlockCount = 7;

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