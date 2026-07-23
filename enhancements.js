(() => {
  const recordsById = new Map();
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

  function replyCategory(record) {
    if (!record) return "";

    const status = (record.current_status || "").toLowerCase();
    const outcome = (record.outcome || "").toLowerCase();
    const notes = (record.notes || "").toLowerCase();
    const combined = `${status} ${outcome} ${notes}`;

    if (
      combined.includes("referred") ||
      combined.includes("provided") && combined.includes("contact") ||
      combined.includes("another individual") ||
      combined.includes("new contact")
    ) {
      return "referral";
    }

    if (
      status === "application closed" ||
      combined.includes("rejection") ||
      combined.includes("rejected") ||
      combined.includes("moving forward with other candidates") ||
      combined.includes("process closed") ||
      combined.includes("not continue")
    ) {
      return "negative";
    }

    if (
      Number(record.interview_count || 0) > 0 ||
      combined.includes("invited") ||
      combined.includes("positive") ||
      combined.includes("progressed") ||
      combined.includes("acknowledged")
    ) {
      return "positive";
    }

    return record.outcome ? "positive" : "";
  }

  function addReplyFilter() {
    if (document.querySelector("#reply-filter")) {
      replyFilter = document.querySelector("#reply-filter");
      return;
    }

    const statusFilter = document.querySelector("#status-filter")?.closest("label");
    if (!statusFilter) return;

    const label = document.createElement("label");
    label.innerHTML = `
      <span>Email reply</span>
      <select id="reply-filter">
        <option value="">All reply outcomes</option>
        <option value="positive">Positive reply</option>
        <option value="negative">Negative reply</option>
        <option value="referral">Referral / new contact</option>
      </select>
    `;
    statusFilter.before(label);
    replyFilter = label.querySelector("select");
    replyFilter.addEventListener("input", applyEnhancements);

    document.querySelector("#clear-filters")?.addEventListener("click", () => {
      replyFilter.value = "";
      window.setTimeout(applyEnhancements, 0);
    });
  }

  function addReplyButtons() {
    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const detailsButton = row.querySelector("[data-details-id]");
      if (!detailsButton) return;

      const record = recordsById.get(detailsButton.dataset.detailsId);
      const category = replyCategory(record);
      row.dataset.replyCategory = category;

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

  function applyReplyFilter() {
    const selected = replyFilter?.value || "";
    let visible = 0;

    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const detailsButton = row.querySelector("[data-details-id]");
      const record = detailsButton ? recordsById.get(detailsButton.dataset.detailsId) : null;
      const category = row.dataset.replyCategory || replyCategory(record);
      const matches = !selected || category === selected;
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
    addReplyFilter();
    addReplyButtons();
    applyReplyFilter();
    applying = false;
  }

  async function initialiseEnhancements() {
    try {
      const response = await fetch("data/applications.csv", { cache: "no-store" });
      if (!response.ok) return;
      const records = parseCsv(await response.text());
      records.forEach((record) => recordsById.set(record.id, record));

      addReplyFilter();
      applyEnhancements();

      const body = document.querySelector("#applications-body");
      if (body) {
        new MutationObserver(() => window.requestAnimationFrame(applyEnhancements)).observe(body, {
          childList: true,
        });
      }
    } catch (error) {
      console.error("Could not initialise reply enhancements", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseEnhancements, { once: true });
  } else {
    initialiseEnhancements();
  }
})();
