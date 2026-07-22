const state = {
  records: [],
};

const elements = {
  body: document.querySelector("#applications-body"),
  totalCount: document.querySelector("#total-count"),
  openRoleCount: document.querySelector("#open-role-count"),
  speculativeCount: document.querySelector("#speculative-count"),
  interviewCount: document.querySelector("#interview-count"),
  visibleCount: document.querySelector("#visible-count"),
  search: document.querySelector("#search-input"),
  city: document.querySelector("#city-filter"),
  type: document.querySelector("#type-filter"),
  status: document.querySelector("#status-filter"),
  interviewsOnly: document.querySelector("#interview-filter"),
  clear: document.querySelector("#clear-filters"),
  emptyState: document.querySelector("#empty-state"),
  dialog: document.querySelector("#interview-dialog"),
  dialogCompany: document.querySelector("#dialog-company"),
  dialogRole: document.querySelector("#dialog-role"),
  dialogStages: document.querySelector("#dialog-stages"),
  dialogOutcome: document.querySelector("#dialog-outcome"),
  dialogClose: document.querySelector(".dialog-close"),
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function normaliseRecord(record) {
  return {
    ...record,
    interview_count: Number(record.interview_count || 0),
  };
}

function splitCities(city) {
  return city
    .split(/\s*[/,]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function addOptions(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function setupFilters() {
  const cities = [...new Set(state.records.flatMap((record) => splitCities(record.city)))].sort();
  const statuses = [...new Set(state.records.map((record) => record.status))].sort();
  addOptions(elements.city, cities);
  addOptions(elements.status, statuses);

  [elements.search, elements.city, elements.type, elements.status, elements.interviewsOnly].forEach(
    (control) => control.addEventListener("input", render),
  );

  elements.clear.addEventListener("click", () => {
    elements.search.value = "";
    elements.city.value = "";
    elements.type.value = "";
    elements.status.value = "";
    elements.interviewsOnly.checked = false;
    render();
    elements.search.focus();
  });
}

function statusClass(status) {
  if (status === "Rejected") return "pill-rejected";
  if (status === "Awaiting response") return "pill-waiting";
  return "pill-applied";
}

function typeClass(type) {
  return type === "Speculative Outreach" ? "pill-speculative" : "pill-open";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function linkMarkup(record) {
  const links = [];

  if (record.job_url) {
    links.push(
      `<a class="job-link" href="${escapeHtml(record.job_url)}" target="_blank" rel="noreferrer">Job link</a>`,
    );
  } else {
    const text = record.activity_type === "Speculative Outreach" ? "No job advert" : "Link not saved";
    links.push(`<span class="no-link">${text}</span>`);
  }

  if (record.interview_count > 0) {
    const label = record.interview_count > 1 ? `INTERVIEW x${record.interview_count}` : "INTERVIEW";
    links.push(
      `<button class="interview-button" type="button" data-interview-id="${escapeHtml(record.id)}">${label}</button>`,
    );
  }

  return links.join("");
}

function contactMarkup(record) {
  if (!record.contact_name) return '<span class="no-link">Not applicable</span>';
  const title = record.contact_title ? `, ${escapeHtml(record.contact_title)}` : "";
  const sent = record.contacted_date ? `<span>Sent ${escapeHtml(record.contacted_date)}</span>` : "";
  return `${escapeHtml(record.contact_name)}${title}${sent}`;
}

function recordMatches(record) {
  const query = elements.search.value.trim().toLowerCase();
  const city = elements.city.value;
  const type = elements.type.value;
  const status = elements.status.value;

  const haystack = Object.values(record).join(" ").toLowerCase();
  const cityMatch = !city || splitCities(record.city).includes(city);

  return (
    (!query || haystack.includes(query)) &&
    cityMatch &&
    (!type || record.activity_type === type) &&
    (!status || record.status === status) &&
    (!elements.interviewsOnly.checked || record.interview_count > 0)
  );
}

function rowMarkup(record) {
  const note = record.notes ? `<span class="role-note">${escapeHtml(record.notes)}</span>` : "";
  return `
    <tr>
      <td class="date-cell" data-label="Date">${escapeHtml(record.activity_date)}</td>
      <td class="company-cell" data-label="Company">${escapeHtml(record.company)}</td>
      <td class="city-cell" data-label="City">${escapeHtml(record.city)}</td>
      <td class="role-cell" data-label="Role or approach">${escapeHtml(record.job_title)}${note}</td>
      <td data-label="Type"><span class="pill ${typeClass(record.activity_type)}">${escapeHtml(record.activity_type)}</span></td>
      <td class="contact-cell" data-label="Contact">${contactMarkup(record)}</td>
      <td data-label="Status"><span class="pill ${statusClass(record.status)}">${escapeHtml(record.status)}</span></td>
      <td class="links-cell" data-label="Links"><div class="link-stack">${linkMarkup(record)}</div></td>
    </tr>
  `;
}

function openInterview(record) {
  elements.dialogCompany.textContent = record.company;
  elements.dialogRole.textContent = record.job_title;
  elements.dialogStages.textContent = record.interview_details || "Interview details not recorded.";
  elements.dialogOutcome.textContent = record.outcome || "Outcome not recorded.";
  elements.dialog.showModal();
}

function render() {
  const filtered = state.records.filter(recordMatches);
  elements.body.innerHTML = filtered.map(rowMarkup).join("");
  elements.visibleCount.textContent = filtered.length;
  elements.emptyState.hidden = filtered.length !== 0;

  document.querySelectorAll("[data-interview-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const record = state.records.find((item) => item.id === button.dataset.interviewId);
      if (record) openInterview(record);
    });
  });
}

function renderSummary() {
  elements.totalCount.textContent = state.records.length;
  elements.openRoleCount.textContent = state.records.filter(
    (record) => record.activity_type === "Open Job Role",
  ).length;
  elements.speculativeCount.textContent = state.records.filter(
    (record) => record.activity_type === "Speculative Outreach",
  ).length;
  elements.interviewCount.textContent = state.records.filter(
    (record) => record.interview_count > 0,
  ).length;
}

async function initialise() {
  try {
    const response = await fetch("data/applications.csv", { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load data (${response.status})`);

    const csv = await response.text();
    state.records = parseCsv(csv)
      .map(normaliseRecord)
      .sort((a, b) => b.date_sort.localeCompare(a.date_sort) || Number(b.id) - Number(a.id));

    renderSummary();
    setupFilters();
    render();
  } catch (error) {
    document.querySelector(".results-panel").innerHTML = `
      <div class="load-error">The tracker data could not be loaded. ${escapeHtml(error.message)}</div>
    `;
  }
}

elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

initialise();
