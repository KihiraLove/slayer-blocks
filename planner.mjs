const CONFIG_VERSION = 1;
const DEFAULT_BLOCK_SLOTS = 7;

export function blockListKey(masterId) {
  return masterId === "spria" ? "turael-aya" : masterId;
}

export function createPlanner(masters, config) {
  const blockLists = new Map(masters.map(({ id }) => [blockListKey(id), new Set()]));
  const fixedBlockSlots = new Map(masters
    .filter((master) => master.fixedBlockSlots !== undefined)
    .map(({ id, fixedBlockSlots }) => [blockListKey(id), fixedBlockSlots]));
  const preferred = new Map(masters.map(({ id }) => [id, new Set()]));
  const requirements = new Set();
  const blocked = (masterId) => blockLists.get(blockListKey(masterId));
  const minimumBlockSlots = () => Math.max(0, ...[...blockLists]
    .filter(([key]) => !fixedBlockSlots.has(key))
    .map(([, list]) => list.size));
  let initialMaster = 0;
  let blockSlots = DEFAULT_BLOCK_SLOTS;
  const blockLimit = (masterId) => fixedBlockSlots.get(blockListKey(masterId)) ?? blockSlots;

  if (config?.version === CONFIG_VERSION) {
    const masterIndex = masters.findIndex(({ id }) => id === config.master);
    if (masterIndex !== -1) initialMaster = masterIndex;
    const savedRequirements = config.requirements ?? config.unmet;
    if (Array.isArray(savedRequirements)) {
      const knownRequirements = new Set(masters.flatMap(({ tasks }) => tasks.map(({ requirement }) => requirement)).filter(Boolean));
      for (const requirement of savedRequirements) {
        if (knownRequirements.has(requirement)) requirements.add(requirement);
      }
    }
    for (const { id, tasks } of masters) {
      const saved = config.choices?.[id];
      if (typeof saved !== "string" || saved.length !== tasks.length || !/^[0-3]+$/.test(saved)) continue;
      const list = blocked(id);
      const fixedLimit = fixedBlockSlots.get(blockListKey(id)) ?? Infinity;
      for (const [index, { name }] of tasks.entries()) {
        const flags = Number(saved[index]);
        if (flags & 1) preferred.get(id).add(name);
        if ((flags & 2) && list.size < fixedLimit) list.add(name);
      }
    }
    // Preserve older configurations that had no limit and stored the two block lists separately.
    const savedSlots = Number.isSafeInteger(config.blockSlots) && config.blockSlots >= 0 ? config.blockSlots : DEFAULT_BLOCK_SLOTS;
    blockSlots = Math.max(savedSlots, minimumBlockSlots());
  }

  function setBlockSlots(value) {
    if (!Number.isSafeInteger(value) || value < minimumBlockSlots()) return false;
    blockSlots = value;
    return true;
  }

  function setBlocked(masterId, name, checked) {
    const list = blocked(masterId);
    if (!checked) list.delete(name);
    else if (list.size < blockLimit(masterId)) list.add(name);
  }

  function configuration(masterIndex) {
    return {
      version: CONFIG_VERSION,
      master: masters[masterIndex].id,
      requirements: [...requirements],
      blockSlots,
      // These strings use the task order in tasks.mjs. Bump the version if that order changes.
      choices: Object.fromEntries(masters.map(({ id, tasks }) => [
        id, tasks.map(({ name }) => Number(preferred.get(id).has(name)) + 2 * Number(blocked(id).has(name))).join(""),
      ])),
    };
  }

  return {
    initialMaster,
    requirements,
    preferred,
    blocked,
    get blockSlots() { return blockSlots; },
    blockLimit,
    minimumBlockSlots,
    setBlockSlots,
    setBlocked,
    configuration,
  };
}
