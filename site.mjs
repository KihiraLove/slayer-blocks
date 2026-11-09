import { mountToolkitHeader, mountToolkitFooter } from "./toolkit-common/toolkit.mjs";
import { calculateAssignments, recommendedBlockCount } from "./calculator.mjs";
import { masters } from "./tasks.mjs";

mountToolkitHeader(document.querySelector("#toolkit-header"));
mountToolkitFooter(document.querySelector("#toolkit-footer"), {
  githubUrl: "https://github.com/KihiraLove/slayer-blocks",
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

function addFlag(row, label, accessibleLabel, requirement) {
  const cell = makeCell(row, label);
  const field = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("aria-label", accessibleLabel);
  field.append(checkbox);
  if (requirement !== undefined) {
    cell.className = "requirement-cell";
    field.append(requirement || "—");
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
  const unmet = addFlag(row, "Unlock requirement", "Mark " + task.name + " unavailable", task.requirement ?? "");
  addValue(row, "Weight", task.weight);
  const preferred = addFlag(row, "Preferred", "Prefer " + task.name);
  const blocked = addFlag(row, "Blocked", "Block " + task.name);
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
    <div class="planner-summary" role="status">
      <div class="panel summary-stat"><span>Assignment weight</span><strong data-total-weight></strong></div>
      <div class="panel summary-stat"><span>Tasks in pool</span><strong data-pool-count></strong></div>
      <div class="panel summary-stat"><span>Tasks blocked</span><strong data-block-count></strong></div>
      <div class="panel summary-stat"><span>Preferred task odds</span><strong data-preferred-chance></strong></div>
    </div>
    <div class="planner-layout">
      <section class="panel task-panel">
        <h2>Assignments</h2>
        <p class="task-help">Check an unmet unlock requirement to remove that task from the pool. Mark the tasks you want as preferred.</p>
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
          <p class="task-help">Highest-weight tasks with requirements met and not marked preferred. Existing blocks stay in the list.</p>
          <p class="result-empty" data-no-recommendations>No block candidates.</p>
          <ol class="result-list" data-recommended></ol>
          <details data-more-results>
            <summary>More candidates</summary>
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
  const totalWeight = panel.querySelector("[data-total-weight]");
  const poolCount = panel.querySelector("[data-pool-count]");
  const blockCount = panel.querySelector("[data-block-count]");
  const preferredChance = panel.querySelector("[data-preferred-chance]");
  const recommendedList = panel.querySelector("[data-recommended]");
  const remainingList = panel.querySelector("[data-remaining]");
  const preferredList = panel.querySelector("[data-preferred]");
  const moreResults = panel.querySelector("[data-more-results]");
  const noRecommendations = panel.querySelector("[data-no-recommendations]");
  const noPreferred = panel.querySelector("[data-no-preferred]");

  function refresh() {
    const flags = rows.map(({ unmet, preferred, blocked }) => ({
      unmet: unmet.checked, preferred: preferred.checked, blocked: blocked.checked,
    }));
    const result = calculateAssignments(master.tasks, flags);
    for (const [index, task] of result.assignments.entries()) {
      const row = rows[index];
      row.weight.textContent = task.finalWeight;
      row.odds.textContent = percent.format(task.odds);
      row.weight.closest("tr").classList.toggle("excluded-task", task.finalWeight === 0);
    }
    totalWeight.textContent = result.totalWeight;
    poolCount.textContent = result.assignments.filter((task) => task.finalWeight > 0).length;
    blockCount.textContent = flags.filter((flag) => flag.blocked).length;
    preferredChance.textContent = percent.format(result.preferredChance);

    const formatWeight = (task) => task.blocked ? task.weight + " · blocked" : String(task.weight);
    showResults(recommendedList, result.recommended.slice(0, recommendedBlockCount), formatWeight);
    showResults(remainingList, result.recommended.slice(recommendedBlockCount), formatWeight);
    showResults(preferredList, result.preferred, (task) => percent.format(task.odds));
    moreResults.hidden = result.recommended.length <= recommendedBlockCount;
    noRecommendations.hidden = result.recommended.length > 0;
    noPreferred.hidden = result.preferred.length > 0;
  }

  body.addEventListener("change", refresh);
  refresh();
}

const tabs = masters.map(makeTab);
const panels = masters.map(makePanel);
tabList.append(...tabs);
panelList.append(...panels);

function selectMaster(index) {
  const activePanel = panels[index];
  if (!activePanel.hasChildNodes()) renderMaster(activePanel, masters[index]);
  for (const [position, tab] of tabs.entries()) {
    const selected = position === index;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panels[position].hidden = !selected;
  }
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener("click", () => selectMaster(index));
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
    tabs[next].focus();
  });
}
selectMaster(0);