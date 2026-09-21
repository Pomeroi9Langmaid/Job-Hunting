const state = {
  records: [],
  companyProfiles: new Map(),
};

let trackerView = "current";

const elements = {
  body: document.querySelector("#applications-body"),
  visibleCount: document.querySelector("#visible-count"),
  lastUpdated: document.querySelector("#last-updated"),
  search: document.querySelector("#search-input"),
  clear: document.querySelector("#clear-filters"),
  emptyState: document.querySelector("#empty-state"),
  viewDescription: document.querySelector("#tracker-view-description"),
  dialog: document.querySelector("#details-dialog"),
  dialogCompany: document.querySelector("#dialog-company"),
  dialogRole: document.querySelector("#dialog-role"),
  dialogStages: document.querySelector("#dialog-stages"),
  dialogOutcome: document.querySelector("#dialog-outcome"),
  dialogClose: document.querySelector(".dialog-close"),
};

const TERMINAL_STATUSES = new Set([
  "Application Closed",
  "Role Filled / Closed",
  "Closed by Andrew",
  "No Current Opportunity",
  "Not Pursued",
  "Not a Fit",
  "Application Incomplete",
]);

const VIEW_DESCRIPTIONS = {
  current: "Open applications, live interview conversations and speculative outreach still awaiting a reply.",
  applications: "Advertised-role applications that are still recorded as open.",
  interviews: "Interview-stage conversations that have not been closed by either side.",
  awaiting: "Speculative outreach where no substantive reply or closure is recorded yet.",
  closed: "Closed, unsuccessful, unavailable or otherwise inactive records.",
  all: "Complete application and outreach history.",
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliseSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function applyCompanyProfile(record) {
  const companyProfile = state.companyProfiles.get(record.company) || {};
  return {
    ...companyProfile,
    ...record,
    sector_group: record.sector_group || companyProfile.sector_group || "",
    industry_sector: record.industry_sector || companyProfile.industry_sector || "",
    employee_band: record.employee_band || companyProfile.employee_band || "",
    employee_estimate: record.employee_estimate || companyProfile.employee_estimate || "",
    contact_email: record.contact_email || companyProfile.contact_email || "",
    interview_count: Number(record.interview_count || 0),
  };
}

function isClosedRecord(record) {
  return TERMINAL_STATUSES.has(record.current_status);
}

function isOpenApplication(record) {
  return record.activity_type === "Open Role Application" && record.current_status === "Active";
}

function isLiveInterview(record) {
  return Number(record.interview_count || 0) > 0 && !isClosedRecord(record);
}

function isAwaitingSpeculative(record) {
  return record.activity_type === "Speculative Outreach" && record.current_status === "Awaiting Response";
}

function isActiveDirectRole(record) {
  return record.activity_type === "Direct Role Outreach" &&
    ["Active", "Awaiting Response"].includes(record.current_status);
}

function isCurrentRecord(record) {
  return isOpenApplication(record) ||
    isLiveInterview(record) ||
    isAwaitingSpeculative(record) ||
    isActiveDirectRole(record);
}

function viewMatches(record, view = trackerView) {
  if (view === "applications") return isOpenApplication(record);
  if (view === "interviews") return isLiveInterview(record);
  if (view === "awaiting") return isAwaitingSpeculative(record);
  if (view === "closed") return !isCurrentRecord(record);
  if (view === "all") return true;
  return isCurrentRecord(record);
}

function searchMatches(record) {
  const query = normaliseSearch(elements.search?.value);
  if (!query) return true;
  const haystack = normaliseSearch([
    record.company,
    record.job_title,
    record.city,
    record.contact_name,
    record.contact_title,
    record.contact_email,
    record.current_status,
    record.activity_type,
    record.sector_group,
    record.industry_sector,
    record.notes,
    record.outcome,
    record.interview_details,
  ].filter(Boolean).join(" "));
  return query.split(/\s+/).every((token) => haystack.includes(token));
}

function routeLabel(type) {
  if (type === "Open Role Application") return "Advertised role";
  if (type === "Direct Role Outreach") return "Direct about role";
  if (type === "Speculative Outreach") return "Speculative";
  return type || "Other";
}

function routeClass(type) {
  if (type === "Open Role Application") return "pill-role";
  if (type === "Direct Role Outreach") return "pill-direct";
  if (type === "Speculative Outreach") return "pill-speculative";
  return "";
}

function statusLabel(record) {
  const status = record.current_status || "";
  if (status === "Active") {
    if (isLiveInterview(record)) return "Conversation active";
    if (record.activity_type === "Open Role Application") return "Open";
    return "Active";
  }
  if (status === "Awaiting Response") return "Awaiting reply";
  if (status === "Application Closed") return "Unsuccessful";
  if (status === "Role Filled / Closed") return "Role filled / withdrawn";
  if (status === "Closed by Andrew") return "Closed by Andrew";
  if (status === "No Current Opportunity") return "No current opportunity";
  if (status === "Application Incomplete") return "Not submitted";
  if (status === "Future Opportunity") return "Future opportunity";
  if (status === "Referred") return "Referred";
  if (status === "Not a Fit") return "Not a fit";
  if (status === "Not Pursued") return "Not pursued";
  return status || "No status";
}

function statusClass(record) {
  if (isLiveInterview(record)) return "status-active";
  if (isOpenApplication(record)) return "status-open";
  if (isAwaitingSpeculative(record)) return "status-awaiting";
  if (record.current_status === "Application Closed") return "status-closed";
  if (record.current_status === "Closed by Andrew") return "status-closed-by-andrew";
  if (record.current_status === "No Current Opportunity") return "status-inactive";
  if (record.current_status === "Application Incomplete") return "status-incomplete";
  return isClosedRecord(record) ? "status-inactive" : "status-neutral";
}

function companyMarkup(record) {
  const city = record.city ? `<span class="tracker-meta">${escapeHtml(record.city)}</span>` : "";
  return `<strong>${escapeHtml(record.company)}</strong>${city}`;
}

function roleMarkup(record) {
  const link = record.job_url
    ? `<a class="tracker-link" href="${escapeHtml(record.job_url)}" target="_blank" rel="noreferrer">Job ad ↗</a>`
    : "";
  return `<strong>${escapeHtml(record.job_title || "Commercial approach")}</strong>${link}`;
}

function contactMarkup(record) {
  if (!record.contact_name) {
    return record.activity_type === "Open Role Application"
      ? '<span class="tracker-muted">Online application</span>'
      : '<span class="tracker-muted">—</span>';
  }
  const title = record.contact_title ? `<span class="tracker-meta">${escapeHtml(record.contact_title)}</span>` : "";
  return `<strong>${escapeHtml(record.contact_name)}</strong>${title}`;
}

function activityMarkup(record) {
  const start = record.activity_date ? `<strong>${escapeHtml(record.activity_date)}</strong>` : "";
  const updated = record.outcome_date && record.outcome_date !== record.activity_date
    ? `<span class="tracker-meta">Updated ${escapeHtml(record.outcome_date)}</span>`
    : "";
  return `${start}${updated}`;
}

function rowMarkup(record) {
  const details = (record.interview_count > 0 || record.outcome || record.notes)
    ? `<button class="details-button tracker-details" type="button" data-details-id="${escapeHtml(record.id)}">Details</button>`
    : "";

  return `
    <tr>
      <td class="company-cell" data-label="Company">${companyMarkup(record)}</td>
      <td class="role-cell" data-label="Role / context">${roleMarkup(record)}</td>
      <td class="route-cell" data-label="Route"><span class="pill ${routeClass(record.activity_type)}">${escapeHtml(routeLabel(record.activity_type))}</span></td>
      <td class="status-cell" data-label="Status"><span class="tracker-status ${statusClass(record)}">${escapeHtml(statusLabel(record))}</span>${details}</td>
      <td class="contact-cell" data-label="Contact">${contactMarkup(record)}</td>
      <td class="date-cell" data-label="Activity">${activityMarkup(record)}</td>
    </tr>
  `;
}

function setTrackerView(view) {
  trackerView = VIEW_DESCRIPTIONS[view] ? view : "current";
  document.querySelectorAll("[data-pipeline-view]").forEach((button) => {
    const active = button.dataset.pipelineView === trackerView;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (elements.viewDescription) elements.viewDescription.textContent = VIEW_DESCRIPTIONS[trackerView];
  render();
}

function renderSummary() {
  const counts = {
    current: state.records.filter((record) => viewMatches(record, "current")).length,
    applications: state.records.filter(isOpenApplication).length,
    interviews: state.records.filter(isLiveInterview).length,
    awaiting: state.records.filter(isAwaitingSpeculative).length,
    closed: state.records.filter((record) => viewMatches(record, "closed")).length,
    all: state.records.length,
  };

  Object.entries(counts).forEach(([key, value]) => {
    const el = document.querySelector(`#view-count-${key}`);
    if (el) el.textContent = String(value);
  });
}

function render() {
  const filtered = state.records.filter((record) => viewMatches(record) && searchMatches(record));
  elements.body.innerHTML = filtered.map(rowMarkup).join("");
  elements.visibleCount.textContent = String(filtered.length);
  elements.emptyState.hidden = filtered.length !== 0;
}

function openDetails(record) {
  elements.dialogCompany.textContent = record.company;
  elements.dialogRole.textContent = record.job_title || "Commercial approach";
  elements.dialogStages.textContent = record.interview_details || "No interview stage recorded.";
  elements.dialogOutcome.textContent = record.outcome || "No closed outcome recorded.";
  elements.dialog.showModal();
}

function renderLastUpdated() {
  const latestDataDate = state.records.reduce((latest, record) => {
    const candidate = record.data_updated_sort || record.date_sort || "";
    return candidate > latest ? candidate : latest;
  }, "");
  const date = latestDataDate ? new Date(`${latestDataDate}T12:00:00`) : new Date();
  elements.lastUpdated.textContent = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function applyStatusPatch(record, patch) {
  if (!patch) return record;
  const merged = { ...record, ...patch };
  if (patch.notes_append) {
    merged.notes = [record.notes, patch.notes_append].filter(Boolean).join(" ");
    delete merged.notes_append;
  }
  return merged;
}

function setupInteractions() {
  elements.search?.addEventListener("input", render);

  elements.clear?.addEventListener("click", () => {
    if (elements.search) elements.search.value = "";
    setTrackerView("current");
    elements.search?.focus();
  });

  document.querySelectorAll("[data-pipeline-view]").forEach((button) => {
    button.addEventListener("click", () => setTrackerView(button.dataset.pipelineView));
  });

  document.addEventListener("click", (event) => {
    const detailButton = event.target.closest?.("[data-details-id]");
    if (detailButton) {
      const record = state.records.find((item) => String(item.id) === String(detailButton.dataset.detailsId));
      if (record) openDetails(record);
      return;
    }

    const topCard = event.target.closest?.("[data-tracker-view]");
    if (topCard) {
      setTrackerView(topCard.dataset.trackerView);
      document.querySelector(".tracker-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  elements.dialogClose?.addEventListener("click", () => elements.dialog.close());
  elements.dialog?.addEventListener("click", (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });
}

async function initialise() {
  try {
    const [response, updatesResponse, companiesResponse, statusResponse] = await Promise.all([
      fetch("data/applications.csv", { cache: "no-store" }),
      fetch("data/application-updates.csv", { cache: "no-store" }),
      fetch("data/companies.csv", { cache: "no-store" }),
      fetch("data/application-status-overrides.json", { cache: "no-store" }),
    ]);

    if (!response.ok) throw new Error(`Could not load activity data (${response.status})`);
    if (!updatesResponse.ok) throw new Error(`Could not load activity updates (${updatesResponse.status})`);
    if (!companiesResponse.ok) throw new Error(`Could not load company data (${companiesResponse.status})`);
    if (!statusResponse.ok) throw new Error(`Could not load status updates (${statusResponse.status})`);

    const companies = parseCsv(await companiesResponse.text());
    state.companyProfiles = new Map(companies.map((profile) => [profile.company, profile]));

    const recordsById = new Map();
    parseCsv(await response.text()).forEach((record) => {
      const legacyPatch = typeof roleOverrides !== "undefined" ? roleOverrides[record.id] : null;
      recordsById.set(String(record.id), legacyPatch ? { ...record, ...legacyPatch } : record);
    });

    if (typeof roleAdditions !== "undefined") {
      roleAdditions.forEach((record) => {
        if (!recordsById.has(String(record.id))) recordsById.set(String(record.id), record);
      });
    }

    parseCsv(await updatesResponse.text()).forEach((update) => {
      const existing = recordsById.get(String(update.id)) || {};
      recordsById.set(String(update.id), { ...existing, ...update });
    });

    const statusOverrides = await statusResponse.json();
    Object.entries(statusOverrides).forEach(([id, patch]) => {
      const existing = recordsById.get(String(id));
      if (existing) recordsById.set(String(id), applyStatusPatch(existing, patch));
    });

    state.records = [...recordsById.values()]
      .filter((record) => record.activity_type !== "Prospective Target")
      .map(applyCompanyProfile)
      .sort((a, b) =>
        String(b.data_updated_sort || b.date_sort || "").localeCompare(String(a.data_updated_sort || a.date_sort || "")) ||
        String(b.date_sort || "").localeCompare(String(a.date_sort || "")) ||
        Number(b.id || 0) - Number(a.id || 0),
      );

    renderLastUpdated();
    renderSummary();
    setupInteractions();
    setTrackerView("current");
  } catch (error) {
    document.querySelector(".results-panel").innerHTML = `
      <div class="load-error">The tracker data could not be loaded. ${escapeHtml(error.message)}</div>
    `;
  }
}

initialise();
