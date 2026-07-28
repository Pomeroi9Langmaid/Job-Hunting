(() => {
  const labels = {
    "pill-role": "APPLIED TO ADVERTISED ROLE",
    "pill-direct": "CONTACTED ABOUT ADVERTISED ROLE",
    "pill-speculative": "SPECULATIVE COMPANY APPROACH",
    "pill-target": "PROSPECTIVE TARGET — NOT CONTACTED",
  };

  let records = [];

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

  function recordForRow(row) {
    const id = row.querySelector("[data-details-id]")?.dataset.detailsId;
    if (id) return records.find((record) => record.id === id);

    const company = row.querySelector(".company-cell")?.textContent.trim() || "";
    const date = row.querySelector(".date-cell")?.textContent.trim() || "";
    const role = row.querySelector(".role-cell")?.textContent.trim() || "";
    return records.find((record) =>
      record.company === company &&
      record.activity_date === date &&
      role.startsWith(record.job_title),
    );
  }

  function clarifyRouteLabels() {
    document.querySelectorAll("#applications-body .pill").forEach((pill) => {
      const className = Object.keys(labels).find((name) => pill.classList.contains(name));
      if (className) pill.textContent = labels[className];
    });

    document.querySelectorAll("#applications-body .progress-step.step-start").forEach((step) => {
      const text = step.childNodes[0]?.textContent?.trim();
      if (text === "DIRECT ROLE OUTREACH") {
        step.childNodes[0].textContent = "CONTACTED ABOUT ADVERTISED ROLE";
      } else if (text === "REACHED OUT") {
        step.childNodes[0].textContent = "SPECULATIVE APPROACH SENT";
      }
    });
  }

  function reconcileRows() {
    if (!records.length) return;
    const from = document.querySelector("#date-from")?.value || "";
    const to = document.querySelector("#date-to")?.value || "";
    let visible = 0;

    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const record = recordForRow(row);
      const matches = Boolean(record && (!from || record.date_sort >= from) && (!to || record.date_sort <= to));
      row.hidden = !matches;
      if (matches) visible += 1;
    });

    const visibleCount = document.querySelector("#visible-count");
    if (visibleCount) visibleCount.textContent = String(visible);
    const empty = document.querySelector("#empty-state");
    if (empty) empty.hidden = visible !== 0;

    const total = document.querySelector("#total-count");
    const applications = document.querySelector("#application-count");
    const direct = document.querySelector("#direct-count");
    const speculative = document.querySelector("#speculative-count");
    const targets = document.querySelector("#target-count");
    const interviews = document.querySelector("#interview-count");
    if (total) total.textContent = String(records.length);
    if (applications) applications.textContent = String(records.filter((r) => r.activity_type === "Open Role Application").length);
    if (direct) direct.textContent = String(records.filter((r) => r.activity_type === "Direct Role Outreach").length);
    if (speculative) speculative.textContent = String(records.filter((r) => r.activity_type === "Speculative Outreach").length);
    if (targets) targets.textContent = String(records.filter((r) => r.activity_type === "Prospective Target").length);
    if (interviews) interviews.textContent = String(records.filter((r) => Number(r.interview_count || 0) > 0).length);

    const updated = document.querySelector("#last-updated");
    if (updated && updated.textContent === "Loading") updated.textContent = "28 July 2026";
  }

  async function initialise() {
    clarifyRouteLabels();
    try {
      const response = await fetch("data/applications.csv", { cache: "no-store" });
      if (response.ok) records = parseCsv(await response.text());
    } catch (error) {
      console.error("Could not load tracker records for row reconciliation", error);
    }

    const body = document.querySelector("#applications-body");
    if (body) {
      new MutationObserver(() => {
        clarifyRouteLabels();
        window.requestAnimationFrame(reconcileRows);
      }).observe(body, { childList: true, subtree: true });
    }

    document.querySelector(".controls")?.addEventListener("input", () =>
      window.requestAnimationFrame(reconcileRows),
    );

    [0, 100, 500, 1500].forEach((delay) => window.setTimeout(() => {
      clarifyRouteLabels();
      reconcileRows();
    }, delay));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();