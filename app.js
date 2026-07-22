const state = {
  records: [],
  companyProfiles: new Map(),
};

const elements = {
  body: document.querySelector("#applications-body"),
  totalCount: document.querySelector("#total-count"),
  applicationCount: document.querySelector("#application-count"),
  directCount: document.querySelector("#direct-count"),
  speculativeCount: document.querySelector("#speculative-count"),
  interviewCount: document.querySelector("#interview-count"),
  visibleCount: document.querySelector("#visible-count"),
  lastUpdated: document.querySelector("#last-updated"),
  search: document.querySelector("#search-input"),
  city: document.querySelector("#city-filter"),
  industry: document.querySelector("#industry-filter"),
  size: document.querySelector("#size-filter"),
  type: document.querySelector("#type-filter"),
  status: document.querySelector("#status-filter"),
  clear: document.querySelector("#clear-filters"),
  emptyState: document.querySelector("#empty-state"),
  dialog: document.querySelector("#details-dialog"),
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

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
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
  const companyProfile = state.companyProfiles.get(record.company) || {};
  return {
    ...record,
    ...companyProfile,
    interview_count: Number(record.interview_count || 0),
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  const industries = [...new Set(state.records.map((record) => record.sector_group).filter(Boolean))].sort();
  const sizeOrder = [
    "1 to 10",
    "11 to 50",
    "51 to 200",
    "201 to 500",
    "501 to 1,000",
    "1,001 to 5,000",
    "5,001 to 10,000",
    "10,001+",
  ];
  const sizesPresent = new Set(state.records.map((record) => record.employee_band).filter(Boolean));
  addOptions(elements.city, cities);
  addOptions(elements.industry, industries);
  addOptions(elements.size, sizeOrder.filter((size) => sizesPresent.has(size)));

  [
    elements.search,
    elements.city,
    elements.industry,
    elements.size,
    elements.type,
    elements.status,
  ].forEach((control) =>
    control.addEventListener("input", render),
  );

  elements.clear.addEventListener("click", () => {
    elements.search.value = "";
    elements.city.value = "";
    elements.industry.value = "";
    elements.size.value = "";
    elements.type.value = "";
    elements.status.value = "";
    render();
    elements.search.focus();
  });
}

function routeLabel(type) {
  if (type === "Open Role Application") return "OPEN ROLE";
  if (type === "Direct Role Outreach") return "DIRECT ABOUT ROLE";
  return "SPECULATIVE";
}

function routeClass(type) {
  if (type === "Open Role Application") return "pill-role";
  if (type === "Direct Role Outreach") return "pill-direct";
  return "pill-speculative";
}

function startLabel(type) {
  if (type === "Open Role Application") return "APPLIED FOR ROLE";
  if (type === "Direct Role Outreach") return "DIRECT ROLE OUTREACH";
  return "SPECULATIVE OUTREACH";
}

function stepMarkup(label, date, className) {
  const dateMarkup = date ? `<small>${escapeHtml(date)}</small>` : "";
  return `<span class="progress-step ${className}">${escapeHtml(label)}${dateMarkup}</span>`;
}

function progressMarkup(record) {
  const steps = [stepMarkup(startLabel(record.activity_type), record.activity_date, "step-start")];

  if (record.interview_steps) {
    record.interview_steps.split(";").forEach((step) => {
      const [date, label] = step.split("|");
      if (label) steps.push(stepMarkup(label, date, "step-interview"));
    });
  }

  if (record.current_status === "Application Closed") {
    steps.push(stepMarkup("APPLICATION CLOSED", record.outcome_date, "step-closed"));
  }

  if (record.current_status === "Closed by Andrew") {
    steps.push(stepMarkup("CLOSED BY ANDREW", record.outcome_date, "step-closed"));
  }

  return steps.join('<span class="flow-arrow" aria-hidden="true">→</span>');
}

function roleMarkup(record) {
  const parts = [escapeHtml(record.job_title)];
  if (record.notes) parts.push(`<span class="cell-note">${escapeHtml(record.notes)}</span>`);
  return parts.join("");
}

function jobAdMarkup(record) {
  if (record.job_url) {
    return `<a class="job-link" href="${escapeHtml(record.job_url)}" target="_blank" rel="noreferrer" aria-label="View the job advertisement for ${escapeHtml(record.job_title)}">VIEW JOB AD</a>`;
  }

  const label = record.activity_type === "Speculative Outreach" ? "Not applicable" : "Not retained";
  return `<span class="job-link-missing">${label}</span>`;
}

function industryMarkup(record) {
  return record.industry_sector
    ? escapeHtml(record.industry_sector)
    : '<span class="cell-note">Not researched</span>';
}

function companySizeMarkup(record) {
  if (!record.employee_band) return '<span class="cell-note">Not researched</span>';

  const estimate = record.employee_estimate
    ? `<span class="cell-note">${escapeHtml(record.employee_estimate)}</span>`
    : "";
  return `<span class="size-band">${escapeHtml(record.employee_band)}</span>${estimate}`;
}

function routeMarkup(record) {
  return `
    <span class="pill ${routeClass(record.activity_type)}">${routeLabel(record.activity_type)}</span>
    <span class="cell-note">${escapeHtml(record.route_reason)}</span>
  `;
}

function contactMarkup(record) {
  if (!record.contact_name) {
    return record.activity_type === "Open Role Application"
      ? '<span class="cell-note">Online application</span>'
      : '<span class="cell-note">Contact not recorded</span>';
  }

  const title = record.contact_title
    ? `<span class="cell-note">${escapeHtml(record.contact_title)}</span>`
    : "";
  const sent = record.contacted_date
    ? `<span class="cell-note">Sent ${escapeHtml(record.contacted_date)}</span>`
    : "";
  return `${escapeHtml(record.contact_name)}${title}${sent}`;
}

function progressFilterMatches(record, selected) {
  if (!selected) return true;
  if (selected === "Interviewed") return record.interview_count > 0;
  if (selected === "Active") {
    return record.current_status === "Active" || record.current_status === "Awaiting Response";
  }
  return record.current_status === selected;
}

function recordMatches(record) {
  const query = elements.search.value.trim().toLowerCase();
  const city = elements.city.value;
  const industry = elements.industry.value;
  const size = elements.size.value;
  const type = elements.type.value;
  const status = elements.status.value;
  const haystack = Object.values(record).join(" ").toLowerCase();

  return (
    (!query || haystack.includes(query)) &&
    (!city || splitCities(record.city).includes(city)) &&
    (!industry || record.sector_group === industry) &&
    (!size || record.employee_band === size) &&
    (!type || record.activity_type === type) &&
    progressFilterMatches(record, status)
  );
}

function rowMarkup(record) {
  const details = record.interview_count > 0 || record.outcome
    ? `<button class="details-button" type="button" data-details-id="${escapeHtml(record.id)}">DETAILS</button>`
    : "";

  return `
    <tr>
      <td class="date-cell" data-label="Date">${escapeHtml(record.activity_date)}</td>
      <td class="company-cell" data-label="Company">${escapeHtml(record.company)}</td>
      <td class="industry-cell" data-label="Industry">${industryMarkup(record)}</td>
      <td class="size-cell" data-label="Company size">${companySizeMarkup(record)}</td>
      <td class="city-cell" data-label="City">${escapeHtml(record.city)}</td>
      <td class="role-cell" data-label="Role">${roleMarkup(record)}</td>
      <td class="job-ad-cell" data-label="Job ad">${jobAdMarkup(record)}</td>
      <td class="route-cell" data-label="Route">${routeMarkup(record)}</td>
      <td class="progress-cell" data-label="Progress">
        <div class="progress-flow">${progressMarkup(record)}</div>
        ${details}
      </td>
      <td class="contact-cell" data-label="Contact">${contactMarkup(record)}</td>
    </tr>
  `;
}

function openDetails(record) {
  elements.dialogCompany.textContent = record.company;
  elements.dialogRole.textContent = record.job_title;
  elements.dialogStages.textContent = record.interview_details || "No interview recorded.";
  elements.dialogOutcome.textContent = record.outcome || "No outcome recorded.";
  elements.dialog.showModal();
}

function render() {
  const filtered = state.records.filter(recordMatches);
  elements.body.innerHTML = filtered.map(rowMarkup).join("");
  elements.visibleCount.textContent = filtered.length;
  elements.emptyState.hidden = filtered.length !== 0;

  document.querySelectorAll("[data-details-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const record = state.records.find((item) => item.id === button.dataset.detailsId);
      if (record) openDetails(record);
    });
  });
}

function renderSummary() {
  elements.totalCount.textContent = state.records.length;
  elements.applicationCount.textContent = state.records.filter(
    (record) => record.activity_type === "Open Role Application",
  ).length;
  elements.directCount.textContent = state.records.filter(
    (record) => record.activity_type === "Direct Role Outreach",
  ).length;
  elements.speculativeCount.textContent = state.records.filter(
    (record) => record.activity_type === "Speculative Outreach",
  ).length;
  elements.interviewCount.textContent = state.records.filter(
    (record) => record.interview_count > 0,
  ).length;
}

function renderLastUpdated(response) {
  const header = response.headers.get("last-modified");
  const latestRecordDate = state.records.reduce(
    (latest, record) => (record.date_sort > latest ? record.date_sort : latest),
    "",
  );
  const date = header ? new Date(header) : new Date(`${latestRecordDate}T12:00:00`);
  elements.lastUpdated.textContent = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

async function initialise() {
  try {
    const [response, companiesResponse] = await Promise.all([
      fetch("data/applications.csv", { cache: "no-store" }),
      fetch("data/companies.csv", { cache: "no-store" }),
    ]);
    if (!response.ok) throw new Error(`Could not load activity data (${response.status})`);
    if (!companiesResponse.ok) {
      throw new Error(`Could not load company data (${companiesResponse.status})`);
    }

    const csv = await response.text();
    const companiesCsv = await companiesResponse.text();
    state.companyProfiles = new Map(
      parseCsv(companiesCsv).map((profile) => [profile.company, profile]),
    );
    state.records = parseCsv(csv)
      .map(normaliseRecord)
      .sort((a, b) => b.date_sort.localeCompare(a.date_sort) || Number(b.id) - Number(a.id));

    renderSummary();
    renderLastUpdated(response);
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
