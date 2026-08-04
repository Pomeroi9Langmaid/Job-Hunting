(() => {
  let records = [];
  let periodFilter;
  let dateFrom;
  let dateTo;
  let replyFilter;
  let applying = false;

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

  function formatDate(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function startOfWeek(date) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = result.getDay() || 7;
    result.setDate(result.getDate() - day + 1);
    return result;
  }

  function endOfWeek(date) {
    const result = startOfWeek(date);
    result.setDate(result.getDate() + 6);
    return result;
  }

  function setDateRange(from, to) {
    dateFrom.value = from ? formatDate(from) : "";
    dateTo.value = to ? formatDate(to) : "";
  }

  function applyPeriodPreset() {
    const now = new Date();
    const selected = periodFilter.value;
    if (selected === "all") setDateRange(null, null);
    if (selected === "today") setDateRange(now, now);
    if (selected === "yesterday") {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      setDateRange(yesterday, yesterday);
    }
    if (selected === "this-week") setDateRange(startOfWeek(now), endOfWeek(now));
    if (selected === "last-week") {
      const from = startOfWeek(now);
      from.setDate(from.getDate() - 7);
      const to = new Date(from);
      to.setDate(to.getDate() + 6);
      setDateRange(from, to);
    }
    if (selected === "this-month") {
      setDateRange(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }
    if (selected === "previous-month") {
      setDateRange(new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0));
    }
    if (selected === "july-2026") setDateRange(new Date(2026, 6, 1), new Date(2026, 6, 31));
  }

  function replyCategory(record) {
    if (!record) return "";
    const status = (record.current_status || "").toLowerCase();
    const combined = `${status} ${record.outcome || ""} ${record.notes || ""}`.toLowerCase();
    if (combined.includes("referred") || combined.includes("new contact") || combined.includes("another individual")) return "referral";
    if (status === "role filled / closed" || combined.includes("already been filled") || combined.includes("role withdrawn") || combined.includes("vacancy withdrawn")) return "unavailable";
    if (status === "application closed" || combined.includes("rejection") || combined.includes("rejected") || combined.includes("process closed") || combined.includes("not continue")) return "negative";
    if (Number(record.interview_count || 0) > 0 || combined.includes("invited") || combined.includes("positive") || combined.includes("progressed") || combined.includes("acknowledged")) return "positive";
    return record.outcome ? "positive" : "";
  }

  function recordForRow(row) {
    const id = row.querySelector("[data-details-id]")?.dataset.detailsId;
    if (id) return records.find((record) => record.id === id);
    const company = row.querySelector(".company-cell")?.textContent.trim() || "";
    const date = row.querySelector(".date-cell")?.textContent.trim() || "";
    const role = row.querySelector(".role-cell")?.textContent.trim() || "";
    return records.find((record) =>
      record.company === company && record.activity_date === date && role.startsWith(record.job_title),
    );
  }

  function queueApply() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(applyExtraFilters);
    });
    window.setTimeout(applyExtraFilters, 50);
  }

  function addFilters() {
    if (document.querySelector("#period-filter")) {
      periodFilter = document.querySelector("#period-filter");
      dateFrom = document.querySelector("#date-from");
      dateTo = document.querySelector("#date-to");
      replyFilter = document.querySelector("#reply-filter");
      return;
    }

    const statusLabel = document.querySelector("#status-filter")?.closest("label");
    if (!statusLabel) return;

    const periodLabel = document.createElement("label");
    periodLabel.innerHTML = `<span>Date period</span><select id="period-filter"><option value="all">All dates</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="this-week">This week (Mon-Sun)</option><option value="last-week">Last week (Mon-Sun)</option><option value="this-month" selected>This month</option><option value="previous-month">Previous month</option><option value="july-2026">July 2026</option><option value="custom">Custom dates</option></select>`;
    const fromLabel = document.createElement("label");
    fromLabel.className = "date-range-control";
    fromLabel.innerHTML = '<span>From</span><input id="date-from" type="date" />';
    const toLabel = document.createElement("label");
    toLabel.className = "date-range-control";
    toLabel.innerHTML = '<span>To</span><input id="date-to" type="date" />';
    const replyLabel = document.createElement("label");
    replyLabel.innerHTML = `<span>Email reply</span><select id="reply-filter"><option value="">All reply outcomes</option><option value="positive">Positive reply</option><option value="negative">Negative reply</option><option value="unavailable">Role filled / withdrawn</option><option value="referral">Referral / new contact</option></select>`;
    statusLabel.before(periodLabel, fromLabel, toLabel, replyLabel);

    periodFilter = periodLabel.querySelector("select");
    dateFrom = fromLabel.querySelector("input");
    dateTo = toLabel.querySelector("input");
    replyFilter = replyLabel.querySelector("select");

    periodFilter.addEventListener("change", () => {
      applyPeriodPreset();
      queueApply();
    });
    [dateFrom, dateTo].forEach((input) => input.addEventListener("change", () => {
      periodFilter.value = "custom";
      queueApply();
    }));
    replyFilter.addEventListener("change", queueApply);
    document.querySelector("#clear-filters")?.addEventListener("click", () => {
      periodFilter.value = "all";
      replyFilter.value = "";
      setDateRange(null, null);
      queueApply();
    });
    applyPeriodPreset();
  }

  function addDateSummary() {
    if (document.querySelector("#date-activity-summary")) return;
    const resultsPanel = document.querySelector(".results-panel");
    if (!resultsPanel) return;
    const summary = document.createElement("section");
    summary.id = "date-activity-summary";
    summary.className = "date-activity-summary";
    summary.innerHTML = `<div class="date-summary-heading"><div><span>Selected period</span><strong id="selected-period-label">All dates</strong></div></div><article><span>Online applications</span><strong id="period-online-count">0</strong></article><article><span>Speculative outreach</span><strong id="period-speculative-count">0</strong></article><article class="period-total"><span>Combined total</span><strong id="period-total-count">0</strong></article>`;
    resultsPanel.before(summary);
  }

  function selectedPeriodLabel() {
    const formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const parse = (value) => new Date(`${value}T12:00:00`);
    if (!dateFrom.value && !dateTo.value) return "All dates";
    if (dateFrom.value && dateTo.value && dateFrom.value === dateTo.value) return formatter.format(parse(dateFrom.value));
    if (dateFrom.value && dateTo.value) return `${formatter.format(parse(dateFrom.value))} to ${formatter.format(parse(dateTo.value))}`;
    if (dateFrom.value) return `From ${formatter.format(parse(dateFrom.value))}`;
    return `Up to ${formatter.format(parse(dateTo.value))}`;
  }

  function updateSummary() {
    const inRange = records.filter((record) => (!dateFrom.value || record.date_sort >= dateFrom.value) && (!dateTo.value || record.date_sort <= dateTo.value));
    document.querySelector("#period-online-count").textContent = String(inRange.filter((record) => record.activity_type === "Open Role Application").length);
    document.querySelector("#period-speculative-count").textContent = String(inRange.filter((record) => record.activity_type === "Speculative Outreach").length);
    document.querySelector("#period-total-count").textContent = String(inRange.filter((record) => record.activity_type === "Open Role Application" || record.activity_type === "Speculative Outreach").length);
    document.querySelector("#selected-period-label").textContent = selectedPeriodLabel();
  }

  function applyExtraFilters() {
    if (applying || !dateFrom || !dateTo || !replyFilter) return;
    applying = true;
    let visible = 0;
    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const record = recordForRow(row);
      const dateMatches = Boolean(record && (!dateFrom.value || record.date_sort >= dateFrom.value) && (!dateTo.value || record.date_sort <= dateTo.value));
      const replyMatches = !replyFilter.value || replyCategory(record) === replyFilter.value;
      const matches = dateMatches && replyMatches;
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    const count = document.querySelector("#visible-count");
    if (count) count.textContent = String(visible);
    const empty = document.querySelector("#empty-state");
    if (empty) empty.hidden = visible !== 0;
    updateSummary();
    applying = false;
  }

  async function initialise() {
    try {
      const response = await fetch("data/applications.csv", { cache: "no-store" });
      if (!response.ok) return;
      records = parseCsv(await response.text());
      addFilters();
      addDateSummary();
      queueApply();

      const body = document.querySelector("#applications-body");
      if (body) {
        new MutationObserver(queueApply).observe(body, { childList: true });
      }
      document.querySelector(".controls")?.addEventListener("input", (event) => {
        if (!["period-filter", "date-from", "date-to", "reply-filter"].includes(event.target.id)) {
          queueApply();
        }
      });
      document.querySelector(".controls")?.addEventListener("change", queueApply);
    } catch (error) {
      console.error("Could not initialise tracker enhancements", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();