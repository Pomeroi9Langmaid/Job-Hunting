(() => {
  const recordsById = new Map();
  let replyFilter;
  let periodFilter;
  let dateFrom;
  let dateTo;
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

    if (selected === "all") {
      setDateRange(null, null);
    } else if (selected === "this-week") {
      setDateRange(startOfWeek(now), endOfWeek(now));
    } else if (selected === "last-week") {
      const from = startOfWeek(now);
      from.setDate(from.getDate() - 7);
      const to = new Date(from);
      to.setDate(to.getDate() + 6);
      setDateRange(from, to);
    } else if (selected === "this-month") {
      setDateRange(
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 0),
      );
    } else if (selected === "previous-month") {
      setDateRange(
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
        new Date(now.getFullYear(), now.getMonth(), 0),
      );
    } else if (selected === "july-2026") {
      setDateRange(new Date(2026, 6, 1), new Date(2026, 6, 31));
    }
  }

  function replyCategory(record) {
    if (!record) return "";

    const status = (record.current_status || "").toLowerCase();
    const outcome = (record.outcome || "").toLowerCase();
    const notes = (record.notes || "").toLowerCase();
    const combined = `${status} ${outcome} ${notes}`;

    if (
      combined.includes("referred") ||
      (combined.includes("provided") && combined.includes("contact")) ||
      combined.includes("another individual") ||
      combined.includes("new contact")
    ) return "referral";

    if (
      status === "application closed" ||
      combined.includes("rejection") ||
      combined.includes("rejected") ||
      combined.includes("moving forward with other candidates") ||
      combined.includes("process closed") ||
      combined.includes("not continue")
    ) return "negative";

    if (
      Number(record.interview_count || 0) > 0 ||
      combined.includes("invited") ||
      combined.includes("positive") ||
      combined.includes("progressed") ||
      combined.includes("acknowledged")
    ) return "positive";

    return record.outcome ? "positive" : "";
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
    periodLabel.innerHTML = `
      <span>Date period</span>
      <select id="period-filter">
        <option value="all">All dates</option>
        <option value="this-week">This week (Mon-Sun)</option>
        <option value="last-week">Last week (Mon-Sun)</option>
        <option value="this-month" selected>This month</option>
        <option value="previous-month">Previous month</option>
        <option value="july-2026">July 2026</option>
        <option value="custom">Custom dates</option>
      </select>
    `;

    const fromLabel = document.createElement("label");
    fromLabel.className = "date-range-control";
    fromLabel.innerHTML = '<span>From</span><input id="date-from" type="date" />';

    const toLabel = document.createElement("label");
    toLabel.className = "date-range-control";
    toLabel.innerHTML = '<span>To</span><input id="date-to" type="date" />';

    const replyLabel = document.createElement("label");
    replyLabel.innerHTML = `
      <span>Email reply</span>
      <select id="reply-filter">
        <option value="">All reply outcomes</option>
        <option value="positive">Positive reply</option>
        <option value="negative">Negative reply</option>
        <option value="referral">Referral / new contact</option>
      </select>
    `;

    statusLabel.before(periodLabel, fromLabel, toLabel, replyLabel);
    periodFilter = periodLabel.querySelector("select");
    dateFrom = fromLabel.querySelector("input");
    dateTo = toLabel.querySelector("input");
    replyFilter = replyLabel.querySelector("select");

    periodFilter.addEventListener("input", () => {
      applyPeriodPreset();
      applyEnhancements();
    });
    [dateFrom, dateTo].forEach((input) => input.addEventListener("input", () => {
      periodFilter.value = "custom";
      applyEnhancements();
    }));
    replyFilter.addEventListener("input", applyEnhancements);

    document.querySelector("#clear-filters")?.addEventListener("click", () => {
      periodFilter.value = "all";
      replyFilter.value = "";
      setDateRange(null, null);
      window.setTimeout(applyEnhancements, 0);
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
    summary.setAttribute("aria-label", "Activity totals for selected dates");
    summary.innerHTML = `
      <div class="date-summary-heading">
        <div>
          <span>Selected period</span>
          <strong id="selected-period-label">All dates</strong>
        </div>
      </div>
      <article><span>Online applications</span><strong id="period-online-count">0</strong></article>
      <article><span>Speculative outreach</span><strong id="period-speculative-count">0</strong></article>
      <article class="period-total"><span>Combined total</span><strong id="period-total-count">0</strong></article>
    `;
    resultsPanel.before(summary);
  }

  function addReplyButtons() {
    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const detailsButton = row.querySelector("[data-details-id]");
      if (!detailsButton) return;

      const record = recordsById.get(detailsButton.dataset.detailsId);
      row.dataset.replyCategory = replyCategory(record);

      if (!record?.outcome || row.querySelector(".email-reply-button")) return;

      let actions = detailsButton.closest(".reply-actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "reply-actions";
        detailsButton.before(actions);
        actions.append(detailsButton);
      }

      const replyButton = document.createElement("button");
      replyButton.className = "email-reply-button";
      replyButton.type = "button";
      replyButton.textContent = "EMAIL REPLY";
      replyButton.setAttribute("aria-label", `View email reply from ${record.company}`);
      replyButton.addEventListener("click", () => detailsButton.click());
      actions.prepend(replyButton);
    });
  }

  function dateMatches(record) {
    if (!record?.date_sort) return false;
    return (!dateFrom.value || record.date_sort >= dateFrom.value) &&
      (!dateTo.value || record.date_sort <= dateTo.value);
  }

  function selectedPeriodLabel() {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const parse = (value) => new Date(`${value}T12:00:00`);

    if (!dateFrom.value && !dateTo.value) return "All dates";
    if (dateFrom.value && dateTo.value) {
      return `${formatter.format(parse(dateFrom.value))} to ${formatter.format(parse(dateTo.value))}`;
    }
    if (dateFrom.value) return `From ${formatter.format(parse(dateFrom.value))}`;
    return `Up to ${formatter.format(parse(dateTo.value))}`;
  }

  function updateDateSummary() {
    const records = [...recordsById.values()].filter(dateMatches);
    const online = records.filter((record) => record.activity_type === "Open Role Application").length;
    const speculative = records.filter((record) => record.activity_type === "Speculative Outreach").length;

    document.querySelector("#period-online-count").textContent = String(online);
    document.querySelector("#period-speculative-count").textContent = String(speculative);
    document.querySelector("#period-total-count").textContent = String(online + speculative);
    document.querySelector("#selected-period-label").textContent = selectedPeriodLabel();
  }

  function applyExtraFilters() {
    const selectedReply = replyFilter?.value || "";
    let visible = 0;

    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const detailsButton = row.querySelector("[data-details-id]");
      const record = detailsButton ? recordsById.get(detailsButton.dataset.detailsId) : null;
      const replyMatches = !selectedReply || replyCategory(record) === selectedReply;
      const matches = dateMatches(record) && replyMatches;
      row.hidden = !matches;
      if (matches) visible += 1;
    });

    const count = document.querySelector("#visible-count");
    if (count) count.textContent = String(visible);
    const empty = document.querySelector("#empty-state");
    if (empty) empty.hidden = visible !== 0;
  }

  function applyEnhancements() {
    if (applying) return;
    applying = true;
    addFilters();
    addDateSummary();
    addReplyButtons();
    updateDateSummary();
    applyExtraFilters();
    applying = false;
  }

  async function initialiseEnhancements() {
    try {
      const response = await fetch("data/applications.csv", { cache: "no-store" });
      if (!response.ok) return;
      const records = parseCsv(await response.text());
      records.forEach((record) => recordsById.set(record.id, record));

      applyEnhancements();

      const body = document.querySelector("#applications-body");
      if (body) {
        new MutationObserver(() => window.requestAnimationFrame(applyEnhancements)).observe(body, {
          childList: true,
        });
      }
    } catch (error) {
      console.error("Could not initialise tracker enhancements", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseEnhancements, { once: true });
  } else {
    initialiseEnhancements();
  }
})();