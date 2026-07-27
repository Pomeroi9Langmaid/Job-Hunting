(() => {
  let records = [];
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

  function recordForRow(row) {
    const id = row.querySelector("[data-details-id]")?.dataset.detailsId;
    if (id) return records.find((record) => record.id === id);

    const company = row.querySelector(".company-cell")?.textContent.trim() || "";
    const date = row.querySelector(".date-cell")?.textContent.trim() || "";
    const role = row.querySelector(".role-cell")?.textContent.trim() || "";

    return records.find(
      (record) =>
        record.company === company &&
        record.activity_date === date &&
        role.startsWith(record.job_title),
    );
  }

  function replyCategory(record) {
    if (!record) return "";
    const status = (record.current_status || "").toLowerCase();
    const combined = `${status} ${record.outcome || ""} ${record.notes || ""}`.toLowerCase();

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

  function applyDateFilter() {
    if (applying) return;
    applying = true;

    const from = document.querySelector("#date-from")?.value || "";
    const to = document.querySelector("#date-to")?.value || "";
    const reply = document.querySelector("#reply-filter")?.value || "";
    let visible = 0;

    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const record = recordForRow(row);
      const dateMatches = record && (!from || record.date_sort >= from) && (!to || record.date_sort <= to);
      const replyMatches = !reply || replyCategory(record) === reply;
      const matches = Boolean(dateMatches && replyMatches);
      row.hidden = !matches;
      if (matches) visible += 1;
    });

    const count = document.querySelector("#visible-count");
    if (count) count.textContent = String(visible);
    const empty = document.querySelector("#empty-state");
    if (empty) empty.hidden = visible !== 0;

    applying = false;
  }

  async function initialise() {
    try {
      const response = await fetch("data/applications.csv", { cache: "no-store" });
      if (!response.ok) return;
      records = parseCsv(await response.text());

      document.querySelector(".controls")?.addEventListener("input", () => {
        window.requestAnimationFrame(applyDateFilter);
      });
      document.querySelector("#clear-filters")?.addEventListener("click", () => {
        window.setTimeout(applyDateFilter, 0);
      });

      const body = document.querySelector("#applications-body");
      if (body) {
        new MutationObserver(() => window.requestAnimationFrame(applyDateFilter)).observe(body, {
          childList: true,
        });
      }

      applyDateFilter();
    } catch (error) {
      console.error("Could not initialise date row matching", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();