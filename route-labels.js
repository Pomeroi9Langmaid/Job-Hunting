(() => {
  const replyUpdates = {
    "37": {
      current_status: "No Current Opportunity",
      outcome_date: "27 Jul 2026",
      outcome: "The company replied that it had no openings and advised following its LinkedIn page for future roles.",
      notes: "Substantive reply received 27 July 2026; no current openings."
    },
    "53": { notes: "Out-of-office reply received 21 July 2026; substantive response still awaited." },
    "55": { notes: "Automatic reply received 22 July 2026; substantive response still awaited." },
    "61": { notes: "Automatic reply received 22 July 2026; substantive response still awaited." },
    "63": {
      current_status: "Referred",
      outcome_date: "22 Jul 2026",
      outcome: "Uwe Moebus referred Andrew to Mona Thor in HR. Andrew followed up with the referred contact on 23 July 2026.",
      notes: "Positive referral received 22 July 2026; follow-up sent 23 July 2026."
    },
    "70": {
      current_status: "Future Opportunity",
      outcome_date: "29 Jul 2026",
      outcome: "No current matching commercial role. The company asked to retain Andrew's CV for possible future international-growth opportunities.",
      notes: "Courteous reply received 29 July 2026; CV retained for possible future opportunities."
    },
    "71": { notes: "Automatic reply received from the replacement contact; substantive response still awaited." },
    "86": { notes: "Out-of-office reply received 28 July 2026; substantive response still awaited." },
    "124": {
      current_status: "Not a Fit",
      outcome_date: "27 Jul 2026",
      outcome: "The company indicated that direct medtech experience was required. Andrew acknowledged the reply and closed the exchange.",
      notes: "Substantive reply received 27 July 2026; sector-experience mismatch. Andrew replied on 28 July."
    },
    "135": { notes: "Automatic reply received 27 July 2026; substantive response still awaited." },
    "138": {
      current_status: "No Current Opportunity",
      outcome_date: "30 Jul 2026",
      outcome: "No current opening. The company normally requires hands-on Class III medical-device experience and had recently recruited for related international roles.",
      notes: "Courteous substantive reply received 30 July 2026; no current opening and specialist experience required."
    },
    "142": { notes: "Automatic reply received 27 July 2026; substantive response still awaited." },
    "143": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." },
    "145": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." },
    "146": { notes: "Automatic redirect received from the original contact. Replacement outreach sent to the current CEO; substantive response still awaited." },
    "148": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." },
    "151": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." }
  };

  function replyCategory(record) {
    if (!record) return "";
    const status = (record.current_status || "").toLowerCase();
    const text = `${status} ${record.outcome || ""} ${record.notes || ""} ${record.route_reason || ""}`.toLowerCase();
    const speculative = record.activity_type === "Speculative Outreach" || record.activity_type === "Referral Follow-up";

    if (text.includes("automatic reply") || text.includes("out-of-office") || text.includes("automatic redirect")) return "automated";
    if (status === "referred" || text.includes("referred") || text.includes("new contact")) return "referral";
    if (status === "future opportunity" || text.includes("cv retained") || text.includes("retain andrew's cv")) return "future";
    if (status === "not a fit" || text.includes("mismatch") || text.includes("direct medtech experience") || text.includes("sector experience was required")) return "not-fit";
    if (status === "no current opportunity" || text.includes("no current opening") || text.includes("no openings right now")) return "no-opening";
    if (!speculative && status === "application closed") return "unsuccessful";
    if (Number(record.interview_count || 0) > 0 || text.includes("invited") || text.includes("progressed")) return "progressing";
    if ((record.contacted_date || record.activity_type === "Open Role Application") && !record.outcome) return "awaiting";
    return record.outcome ? "other-reply" : "";
  }

  function progressLabel(record) {
    const status = record.current_status || "";
    if (status === "Future Opportunity") return "CV retained / future opportunity";
    if (status === "No Current Opportunity") return "No current opportunity";
    if (status === "Not a Fit") return "Not a fit / experience mismatch";
    if (status === "Referred") return "Referred to another contact";
    if (status === "Application Closed") {
      return record.activity_type === "Open Role Application"
        ? "Application unsuccessful / process ended"
        : "No current opportunity";
    }
    if (status === "Awaiting Response") return "Awaiting reply";
    if (status === "Active") return record.activity_type === "Open Role Application" ? "Application active" : "Active";
    if (status === "Closed by Andrew") return "Closed / withdrawn by Andrew";
    return status;
  }

  function applyReplyUpdates() {
    if (typeof state === "undefined" || !Array.isArray(state.records) || state.records.length === 0) {
      window.setTimeout(applyReplyUpdates, 100);
      return;
    }

    state.records = state.records.map((record) => ({ ...record, ...(replyUpdates[record.id] || {}) }));
    renderSummary();
    render();
    configureFilters();
    relabelProgress();
  }

  function configureFilters() {
    const reply = document.querySelector("#reply-filter");
    if (reply && !reply.dataset.clarified) {
      reply.dataset.clarified = "true";
      reply.innerHTML = `
        <option value="">All email outcomes</option>
        <option value="progressing">Positive reply / progressing</option>
        <option value="future">Positive reply — no role now, CV retained</option>
        <option value="referral">Referral / new contact supplied</option>
        <option value="no-opening">Courteous reply — no current opening</option>
        <option value="not-fit">Reply — not a fit / experience mismatch</option>
        <option value="unsuccessful">Advertised-role application unsuccessful</option>
        <option value="automated">Automatic reply / out of office</option>
        <option value="awaiting">No substantive reply yet</option>`;

      reply.addEventListener("change", (event) => {
        event.stopImmediatePropagation();
        applyReplyFilter();
      }, true);
    }

    const status = document.querySelector("#status-filter");
    if (status && !status.dataset.clarified) {
      status.dataset.clarified = "true";
      Array.from(status.options).forEach((option) => {
        if (option.value === "Active") option.textContent = "Still active / awaiting outcome";
        if (option.value === "Application Closed") option.textContent = "Application unsuccessful / process ended";
        if (option.value === "Closed by Andrew") option.textContent = "Closed / withdrawn by Andrew";
      });
    }
  }

  function applyReplyFilter() {
    const selected = document.querySelector("#reply-filter")?.value || "";
    let visible = 0;
    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const company = row.querySelector(".company-cell")?.textContent.trim();
      const date = row.querySelector(".date-cell")?.textContent.trim();
      const role = row.querySelector(".role-cell")?.textContent.trim() || "";
      const record = state.records.find((item) => item.company === company && item.activity_date === date && role.startsWith(item.job_title));
      const replyMatches = !selected || replyCategory(record) === selected;
      const alreadyHidden = row.hidden;
      row.hidden = alreadyHidden || !replyMatches;
      if (!row.hidden) visible += 1;
    });
    const count = document.querySelector("#visible-count");
    if (count) count.textContent = String(visible);
    const empty = document.querySelector("#empty-state");
    if (empty) empty.hidden = visible !== 0;
  }

  function relabelProgress() {
    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const company = row.querySelector(".company-cell")?.textContent.trim();
      const date = row.querySelector(".date-cell")?.textContent.trim();
      const role = row.querySelector(".role-cell")?.textContent.trim() || "";
      const record = state.records.find((item) => item.company === company && item.activity_date === date && role.startsWith(item.job_title));
      const flow = row.querySelector(".progress-flow");
      if (!record || !flow) return;
      const label = progressLabel(record);
      if (label && flow.textContent.trim() !== label) flow.textContent = label;
    });
  }

  applyReplyUpdates();
})();