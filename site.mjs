import { mountToolkitCookiePreferences } from "./toolkit-common/cookies.mjs";
import { mountToolkitHeader, mountToolkitFooter } from "./toolkit-common/toolkit.mjs";
import { STOP_THE_WYVERN, calculateAssignments, sortAssignmentIndexes } from "./calculator.mjs?v=unlock-rules";
import { blockListKey, createPlanner } from "./planner.mjs?v=unlock-rules";
import { masters } from "./tasks.mjs?v=block-slots";

const preferences = mountToolkitCookiePreferences({
  consentCookie: "slayer_cookie_consent",
  configCookie: "slayer_task_config",
  description: "This site saves your selected Slayer master and task settings in a cookie so they are restored next time you visit. A small consent cookie remembers this choice.",
  getConfig: () => planner.configuration(selectedMaster),
});
const planner = createPlanner(masters, preferences.config);
let selectedMaster = planner.initialMaster;
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

function makeTaskRow(body, task, index) {
  const row = body.insertRow();
  row.dataset.taskIndex = String(index);
  row.setAttribute("role", "row");
  const name = document.createElement("th");
  name.scope = "row";
  name.setAttribute("role", "rowheader");
  name.textContent = task.name;
  if (task.note) {
    const note = document.createElement("small");
    note.className = "task-note";
    note.textContent = "(" + task.note + ")";
    name.append(" ", note);
  }
  row.append(name);

  addValue(row, "Amount", task.amount ?? "—");
  addValue(row, "Extended", task.extendedAmount ?? "—");
  let requirement = null;
  if (task.requirement) {
    const label = task.requirement === STOP_THE_WYVERN ? "Stop assigning " + task.name : "Unlock " + task.name;
    requirement = addFlag(row, "Unlock requirement", label, "requirementChecked", task.requirement);
  } else {
    row.insertCell();
  }
  addValue(row, "Weight", task.weight);
  const preferred = task.weight > 0 ? addFlag(row, "Preferred", "Prefer " + task.name, "preferred") : null;
  if (!preferred) row.insertCell();
  const blocked = addFlag(row, "Blocked", "Block " + task.name, "blocked");
  const weight = addValue(row, "Final weight", "");
  const odds = addValue(row, "Odds", "");

  return { element: row, requirement, preferred, blocked, weight, odds };
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
        <div class="assignment-heading">
          <div class="assignment-title">
            <h2>Assignments</h2>
            <small data-shared-list hidden></small>
          </div>
          <div class="block-slots">
            <label>
              <span>Number of block slots</span>
              <input type="number" min="0" step="1" inputmode="numeric">
            </label>
            <small data-slots-used aria-live="polite"></small>
          </div>
        </div>
        <p class="slot-error" data-slot-error role="status"></p>
        <div class="task-table-wrap" role="region" aria-label="Scrollable assignment table" tabindex="0">
          <table class="task-table" role="table" aria-label="Slayer assignments">
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col"><button type="button" class="sort-button" data-sort="name">Task<span aria-hidden="true"></span></button></th>
                <th scope="col"><button type="button" class="sort-button" data-sort="amount">Amount<span aria-hidden="true"></span></button></th>
                <th scope="col"><button type="button" class="sort-button" data-sort="extendedAmount">Extended<span aria-hidden="true"></span></button></th>
                <th scope="col"><button type="button" class="sort-button" data-sort="requirement">Unlock requirement<span aria-hidden="true"></span></button></th>
                <th scope="col"><button type="button" class="sort-button" data-sort="weight">Weight<span aria-hidden="true"></span></button></th>
                <th scope="col"><button type="button" class="sort-button" data-sort="preferred">Preferred<span aria-hidden="true"></span></button></th>
                <th scope="col"><button type="button" class="sort-button" data-sort="blocked">Blocked<span aria-hidden="true"></span></button></th>
                <th scope="col"><button type="button" class="sort-button" data-sort="finalWeight">Final weight<span aria-hidden="true"></span></button></th>
                <th scope="col"><button type="button" class="sort-button" data-sort="odds">Odds<span aria-hidden="true"></span></button></th>
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
            <ol class="result-list" data-remaining></ol>
          </details>
        </section>
        <section class="panel result-panel">
          <h2>Preferred tasks</h2>
          <p class="result-empty" data-no-preferred>No preferred tasks selected.</p>
          <ul class="result-list" data-preferred></ul>
        </section>
      </div>
    </div>`;
  const tasks = [...master.tasks];
  const partner = masters.find((other) => other.id !== master.id && blockListKey(other.id) === blockListKey(master.id));
  if (partner) {
    const shared = panel.querySelector("[data-shared-list]");
    shared.textContent = master.id === "spria" ? "Blocklist shared with Turael/Aya" : "Block list shared with Spria";
    shared.hidden = false;
    for (const { name } of partner.tasks) {
      if (master.tasks.some((task) => task.name === name)) continue;
      tasks.push({ name, note: partner.name + " only", weight: 0 });
    }
  }

  const body = panel.querySelector("tbody");
  const rows = tasks.map((task, index) => makeTaskRow(body, task, index));
  const recommendedList = panel.querySelector("[data-recommended]");
  const remainingList = panel.querySelector("[data-remaining]");
  const preferredList = panel.querySelector("[data-preferred]");
  const moreResults = panel.querySelector("[data-more-results]");
  const noRecommendations = panel.querySelector("[data-no-recommendations]");
  const noPreferred = panel.querySelector("[data-no-preferred]");

  const blockedTasks = planner.blocked(master.id);
  const preferredTasks = planner.preferred.get(master.id);
  const slotInput = panel.querySelector(".block-slots input");
  const slotsUsed = panel.querySelector("[data-slots-used]");
  const slotError = panel.querySelector("[data-slot-error]");
  slotInput.addEventListener("change", () => {
    if (!planner.setBlockSlots(slotInput.valueAsNumber)) {
      slotInput.value = planner.blockSlots;
      const minimum = planner.minimumBlockSlots();
      slotError.textContent = minimum === 0
        ? "Enter a non-negative whole number of block slots."
        : "Enter a whole number of at least " + minimum + " to keep your current blocks.";
      return;
    }
    refreshAll();
    preferences.save();
  });

  let sortColumn = "name";
  let sortDirection = "ascending";
  const sortButtons = [...panel.querySelectorAll("[data-sort]")];
  function updateSortHeader() {
    for (const button of sortButtons) {
      const column = button.closest("th");
      if (button.dataset.sort === sortColumn) column.setAttribute("aria-sort", sortDirection);
      else column.removeAttribute("aria-sort");
    }
  }
  for (const button of sortButtons) {
    button.addEventListener("click", () => {
      const column = button.dataset.sort;
      sortDirection = column === sortColumn && sortDirection === "ascending" ? "descending" : "ascending";
      sortColumn = column;
      updateSortHeader();
      refresh();
    });
  }
  updateSortHeader();

  function refresh() {
    const flags = tasks.map((task) => ({
      preferred: preferredTasks.has(task.name),
      blocked: blockedTasks.has(task.name),
      requirementChecked: planner.requirements.has(task.requirement),
    }));
    const result = calculateAssignments(tasks, flags);
    const full = blockedTasks.size >= planner.blockSlots;
    for (const [index, task] of result.assignments.entries()) {
      const row = rows[index];
      if (row.requirement) row.requirement.checked = task.requirementChecked;
      if (row.preferred) row.preferred.checked = task.preferred;
      row.blocked.checked = task.blocked;
      row.blocked.disabled = full && !task.blocked;
      row.weight.textContent = task.finalWeight;
      row.odds.textContent = percent.format(task.odds);
      row.element.classList.toggle("excluded-task", task.finalWeight === 0);
    }
    slotInput.value = planner.blockSlots;
    slotsUsed.textContent = blockedTasks.size + " used";
    slotError.textContent = "";

    const ordered = sortAssignmentIndexes(result.assignments, sortColumn, sortDirection);
    if (ordered.some((index, position) => body.rows[position] !== rows[index].element)) {
      const focused = document.activeElement;
      body.append(...ordered.map((index) => rows[index].element));
      if (body.contains(focused)) focused.focus({ preventScroll: true });
    }

    const formatWeight = (task) => task.blocked ? task.weight + " · blocked" : String(task.weight);
    const recommendedCount = Math.min(planner.blockSlots, result.recommended.length);
    showResults(recommendedList, result.recommended.slice(0, recommendedCount), formatWeight);
    showResults(remainingList, result.recommended.slice(recommendedCount), formatWeight);
    remainingList.start = recommendedCount + 1;
    showResults(preferredList, result.preferred, (task) => percent.format(task.odds));
    moreResults.hidden = result.recommended.length <= recommendedCount;
    noRecommendations.hidden = result.recommended.length > 0;
    noPreferred.hidden = result.preferred.length > 0;
  }

  body.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const task = tasks[Number(input.closest("tr").dataset.taskIndex)];
    const flag = input.dataset.flag;
    if (flag === "blocked") {
      planner.setBlocked(master.id, task.name, input.checked);
    } else {
      const set = flag === "requirementChecked" ? planner.requirements : preferredTasks;
      const value = flag === "requirementChecked" ? task.requirement : task.name;
      if (input.checked) set.add(value);
      else set.delete(value);
    }
    refreshAll();
    preferences.save();
  });

  return refresh;
}

const tabs = masters.map(makeTab);
const panels = masters.map(makePanel);
const refreshMasters = [];

function refreshAll() {
  refreshMasters.forEach((refresh) => refresh());
}

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