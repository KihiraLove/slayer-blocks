import { mountToolkitCookiePreferences } from "./toolkit-common/cookies.mjs";
import { mountToolkitHeader, mountToolkitFooter } from "./toolkit-common/toolkit.mjs";
import { calculateAssignments, recommendedBlockCount } from "./calculator.mjs";
import { masters } from "./tasks.mjs?v=shared-cookies";

// The strings in the cookie use the task order in tasks.mjs. Bump this version if that order changes.
const CONFIG_VERSION = 1;
const unmetRequirements = new Set();
const choices = new Map(masters.map((master) => [
  master.id, master.tasks.map(() => ({ preferred: false, blocked: false })),
]));
let selectedMaster = 0;

function currentConfiguration() {
  return {
    version: CONFIG_VERSION,
    master: masters[selectedMaster].id,
    unmet: [...unmetRequirements],
    choices: Object.fromEntries([...choices].map(([id, tasks]) => [
      id, tasks.map(({ preferred, blocked }) => Number(preferred) + 2 * Number(blocked)).join(""),
    ])),
  };
}

function restoreConfiguration(config) {
  if (config?.version !== CONFIG_VERSION) return;

  const masterIndex = masters.findIndex((master) => master.id === config.master);
  if (masterIndex !== -1) selectedMaster = masterIndex;
  if (Array.isArray(config.unmet)) {
    const knownRequirements = new Set(masters.flatMap((master) => master.tasks.map((task) => task.requirement)).filter(Boolean));
    for (const requirement of config.unmet) {
      if (knownRequirements.has(requirement)) unmetRequirements.add(requirement);
    }
  }
  for (const [id, tasks] of choices) {
    const saved = config.choices?.[id];
    if (typeof saved !== "string" || saved.length !== tasks.length || !/^[0-3]+$/.test(saved)) continue;
    for (const [index, task] of tasks.entries()) {
      const flags = Number(saved[index]);
      task.preferred = (flags & 1) !== 0;
      task.blocked = (flags & 2) !== 0;
    }
  }
}

const preferences = mountToolkitCookiePreferences({
  consentCookie: "slayer_cookie_consent",
  configCookie: "slayer_task_config",
  description: "This site saves your selected Slayer master and task settings in a cookie so they are restored next time you visit. A small consent cookie remembers this choice.",
  getConfig: currentConfiguration,
});
restoreConfiguration(preferences.config);
mountToolkitHeader(document.querySelector("#toolkit-header"));
mountToolkitFooter(document.querySelector("#toolkit-footer"), {
  githubUrl: "https://github.com/KihiraLove/slayer-blocks",
  cookieSettings: preferences.settingsButton,
});

const tabList = document.querySelector(".master-tabs");
const panelList = document.querySelector("#master-panels");
const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 2, minimumFractionDigits: 2 });

function makeTab(master) {
  const button = document.createElement("button");
  button.type = "button";
  button.id = "tab-" + master.id;
  button.className = "master-tab";
  button.setAttribute("role", "tab");
  button.setAttribute("aria-controls", "panel-" + master.id);

  const portraits = document.createElement("span");
  portraits.className = "master-portraits";
  for (const portrait of master.portraits) {
    const image = document.createElement("img");
    image.src = "./assets/chatheads/" + portrait + ".png";
    image.alt = "";
    image.width = 32;
    image.height = 36;
    portraits.append(image);
  }

  const name = document.createElement("span");
  name.textContent = master.name;
  button.append(portraits, name);
  return button;
}

function makePanel(master) {
  const panel = document.createElement("section");
  panel.id = "panel-" + master.id;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", "tab-" + master.id);
  return panel;
}

function makeCell(row, label) {
  const cell = row.insertCell();
  cell.setAttribute("role", "cell");
  const caption = document.createElement("span");
  caption.className = "mobile-label";
  caption.setAttribute("aria-hidden", "true");
  caption.textContent = label;
  cell.append(caption);
  return cell;
}

function addValue(row, label, text) {
  const cell = makeCell(row, label);
  const value = document.createElement("span");
  value.textContent = text;
  cell.append(value);
  return value;
}

function addFlag(row, label, accessibleLabel, flag, requirement) {
  const cell = makeCell(row, label);
  const field = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.flag = flag;
  checkbox.setAttribute("aria-label", accessibleLabel);
  field.append(checkbox);
  if (requirement !== undefined) {
    cell.className = "requirement-cell";
    field.append(requirement);
  }
  cell.append(field);
  return checkbox;
}

function makeTaskRow(body, task) {
  const row = body.insertRow();
  row.setAttribute("role", "row");
  const name = document.createElement("th");
  name.scope = "row";
  name.setAttribute("role", "rowheader");
  name.textContent = task.name;
  row.append(name);

  addValue(row, "Amount", task.amount);
  addValue(row, "Extended", task.extendedAmount ?? "—");
  let unmet = null;
  if (task.requirement) {
    unmet = addFlag(row, "Unlock requirement", "Mark " + task.name + " unavailable", "unmet", task.requirement);
  } else {
    row.insertCell().className = "empty-requirement";
  }
  addValue(row, "Weight", task.weight);
  const preferred = addFlag(row, "Preferred", "Prefer " + task.name, "preferred");
  const blocked = addFlag(row, "Blocked", "Block " + task.name, "blocked");
  const weight = addValue(row, "Final weight", "");
  const odds = addValue(row, "Odds", "");

  return { unmet, preferred, blocked, weight, odds };
}

function showResults(list, tasks, formatValue) {
  const items = tasks.map((task) => {
    const item = document.createElement("li");
    const content = document.createElement("div");
    const name = document.createElement("span");
    const value = document.createElement("strong");
    name.textContent = task.name;
    value.textContent = formatValue(task);
    content.append(name, value);
    item.append(content);
    return item;
  });
  list.replaceChildren(...items);
}

function renderMaster(panel, master) {
  panel.innerHTML = `
    <div class="planner-layout">
      <section class="panel task-panel">
        <h2>Assignments</h2>
        <div class="task-table-wrap" role="region" aria-label="Scrollable assignment table" tabindex="0">
          <table class="task-table" role="table" aria-label="Slayer assignments">
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col">Task</th>
                <th scope="col">Amount</th>
                <th scope="col">Extended</th>
                <th scope="col">Unlock requirement</th>
                <th scope="col">Weight</th>
                <th scope="col">Preferred</th>
                <th scope="col">Blocked</th>
                <th scope="col">Final weight</th>
                <th scope="col">Odds</th>
              </tr>
            </thead>
            <tbody role="rowgroup"></tbody>
          </table>
        </div>
      </section>
      <div class="planner-results">
        <section class="panel result-panel">
          <h2>Recommended blocks</h2>
          <p class="result-empty" data-no-recommendations>No block candidates.</p>
          <ol class="result-list" data-recommended></ol>
          <details data-more-results>
            <summary>Full list</summary>
            <ol class="result-list" start="8" data-remaining></ol>
          </details>
        </section>
        <section class="panel result-panel">
          <h2>Preferred tasks</h2>
          <p class="result-empty" data-no-preferred>No preferred tasks selected.</p>
          <ul class="result-list" data-preferred></ul>
        </section>
      </div>
    </div>`;
  const body = panel.querySelector("tbody");
  const rows = master.tasks.map((task) => makeTaskRow(body, task));
  const recommendedList = panel.querySelector("[data-recommended]");
  const remainingList = panel.querySelector("[data-remaining]");
  const preferredList = panel.querySelector("[data-preferred]");
  const moreResults = panel.querySelector("[data-more-results]");
  const noRecommendations = panel.querySelector("[data-no-recommendations]");
  const noPreferred = panel.querySelector("[data-no-preferred]");

  const taskChoices = choices.get(master.id);

  function refresh() {
    const flags = master.tasks.map((task, index) => ({
      ...taskChoices[index],
      unmet: unmetRequirements.has(task.requirement),
    }));
    const result = calculateAssignments(master.tasks, flags);
    for (const [index, task] of result.assignments.entries()) {
      const row = rows[index];
      if (row.unmet) row.unmet.checked = task.unmet;
      row.preferred.checked = task.preferred;
      row.blocked.checked = task.blocked;
      row.weight.textContent = task.finalWeight;
      row.odds.textContent = percent.format(task.odds);
      row.weight.closest("tr").classList.toggle("excluded-task", task.finalWeight === 0);
    }

    const formatWeight = (task) => task.blocked ? task.weight + " · blocked" : String(task.weight);
    showResults(recommendedList, result.recommended.slice(0, recommendedBlockCount), formatWeight);
    showResults(remainingList, result.recommended.slice(recommendedBlockCount), formatWeight);
    showResults(preferredList, result.preferred, (task) => percent.format(task.odds));
    moreResults.hidden = result.recommended.length <= recommendedBlockCount;
    noRecommendations.hidden = result.recommended.length > 0;
    noPreferred.hidden = result.preferred.length > 0;
  }

  body.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const index = input.closest("tr").sectionRowIndex;
    const flag = input.dataset.flag;
    if (flag === "unmet") {
      const { requirement } = master.tasks[index];
      if (input.checked) unmetRequirements.add(requirement);
      else unmetRequirements.delete(requirement);
      for (const refreshMaster of refreshMasters) refreshMaster?.();
    } else {
      taskChoices[index][flag] = input.checked;
      refresh();
    }
    preferences.save();
  });

  return refresh;
}
const tabs = masters.map(makeTab);
const panels = masters.map(makePanel);
const refreshMasters = [];
tabList.append(...tabs);
panelList.append(...panels);

function selectMaster(index) {
  const activePanel = panels[index];
  refreshMasters[index] ??= renderMaster(activePanel, masters[index]);
  refreshMasters[index]();
  selectedMaster = index;
  for (const [position, tab] of tabs.entries()) {
    const selected = position === index;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panels[position].hidden = !selected;
  }
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener("click", () => {
    selectMaster(index);
    preferences.save();
  });
  tab.addEventListener("keydown", (event) => {
    const destinations = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    const next = destinations[event.key];
    selectMaster(next);
    preferences.save();
    tabs[next].focus();
  });
}
selectMaster(selectedMaster);