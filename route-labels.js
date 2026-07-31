(() => {
  const updates = {
    "37": { current_status: "No Current Opportunity", outcome_date: "27 Jul 2026", outcome: "No current openings; advised to follow the company on LinkedIn.", notes: "Substantive reply received 27 July 2026; no current openings." },
    "53": { notes: "Out-of-office reply received 21 July 2026; substantive response still awaited." },
    "55": { notes: "Automatic reply received 22 July 2026; substantive response still awaited." },
    "61": { notes: "Automatic reply received 22 July 2026; substantive response still awaited." },
    "63": { current_status: "Referred", outcome_date: "22 Jul 2026", outcome: "Referred to Mona Thor in HR; follow-up sent 23 July 2026.", notes: "Positive referral received 22 July 2026." },
    "70": { current_status: "Future Opportunity", outcome_date: "29 Jul 2026", outcome: "No current matching role; CV retained for possible future opportunities.", notes: "Courteous reply received 29 July 2026; CV retained." },
    "71": { notes: "Automatic reply received from the replacement contact; substantive response still awaited." },
    "86": { notes: "Out-of-office reply received 28 July 2026; substantive response still awaited." },
    "124": { current_status: "Not a Fit", outcome_date: "27 Jul 2026", outcome: "Direct medtech experience was required; exchange closed.", notes: "Substantive reply received 27 July 2026; sector-experience mismatch." },
    "135": { notes: "Automatic reply received 27 July 2026; substantive response still awaited." },
    "138": { current_status: "No Current Opportunity", outcome_date: "30 Jul 2026", outcome: "No current opening; hands-on Class III medical-device experience normally required.", notes: "Courteous substantive reply received 30 July 2026." },
    "142": { notes: "Automatic reply received 27 July 2026; substantive response still awaited." },
    "143": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." },
    "145": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." },
    "146": { notes: "Automatic redirect received; replacement outreach sent to the current CEO." },
    "148": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." },
    "151": { notes: "Automatic reply received 28 July 2026; substantive response still awaited." },
    "154": { current_status: "Application Closed", outcome_date: "30 Jul 2026", outcome: "Dyson did not progress the Field Manager application.", notes: "Application unsuccessful; rejection received 30 July 2026." }
  };

  const amber = { id: "155", activity_date: "30 Jul 2026", date_sort: "2026-07-30", company: "amber", city: "Nordics / Copenhagen", job_title: "Account Executive Nordics (F/M/*)", activity_type: "Open Role Application", job_url: "https://jobs.ashbyhq.com/amber/78d03148-3101-461d-a84c-e20a4250579f", contact_name: "", contact_title: "", contacted_date: "", current_status: "Active", outcome_date: "", interview_count: 0, interview_details: "", outcome: "", route_reason: "Applied through Ashby.", notes: "Application confirmation received 30 July 2026.", interview_steps: "", sector_group: "Software / SaaS", industry_sector: "Business AI / Knowledge Management SaaS", employee_band: "", employee_estimate: "" };

  const norm = (value) => String(value || "").trim().toLowerCase();

  function replyCategory(record) {
    if (!record) return "";
    const status = norm(record.current_status);
    const text = norm(`${status} ${record.outcome || ""} ${record.notes || ""}`);
    const speculative = ["Speculative Outreach", "Referral Follow-up"].includes(record.activity_type);
    if (text.includes("automatic reply") || text.includes("out-of-office") || text.includes("automatic redirect")) return "automated";
    if (status === "referred" || text.includes("referred")) return "referral";
    if (status === "future opportunity" || text.includes("cv retained")) return "future";
    if (status === "not a fit" || text.includes("mismatch") || text.includes("medtech experience")) return "not-fit";
    if (status === "no current opportunity" || text.includes("no current opening") || text.includes("no current openings")) return "no-opening";
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
    if (status === "Application Closed") return record.activity_type === "Open Role Application" ? "Application unsuccessful / process ended" : "No current opportunity";
    if (status === "Awaiting Response") return "Awaiting reply";
    if (status === "Active") return record.activity_type === "Open Role Application" ? "Application active" : "Active";
    if (status === "Closed by Andrew") return "Closed / withdrawn by Andrew";
    return status;
  }

  function findRecord(row) {
    const id = row.querySelector("[data-details-id]")?.dataset.detailsId;
    if (id) return state.records.find((item) => item.id === id);
    const company = row.querySelector(".company-cell")?.textContent.trim();
    const date = row.querySelector(".date-cell")?.textContent.trim();
    const role = row.querySelector(".role-cell")?.textContent.trim() || "";
    return state.records.find((item) => item.company === company && item.activity_date === date && role.startsWith(item.job_title));
  }

  function filterRows() {
    const values = {
      search: norm(document.querySelector("#search-input")?.value),
      city: document.querySelector("#city-filter")?.value || "",
      industry: document.querySelector("#industry-filter")?.value || "",
      size: document.querySelector("#size-filter")?.value || "",
      route: document.querySelector("#type-filter")?.value || "",
      status: document.querySelector("#status-filter")?.value || "",
      reply: document.querySelector("#reply-filter")?.value || "",
      from: document.querySelector("#date-from")?.value || "",
      to: document.querySelector("#date-to")?.value || ""
    };
    let visible = 0;
    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const record = findRecord(row);
      if (!record) { row.hidden = true; return; }
      const haystack = norm([record.company, record.job_title, record.contact_name, record.contact_title, record.city, record.industry_sector, record.sector_group, record.notes, record.outcome].join(" "));
      const matches = (!values.search || haystack.includes(values.search))
        && (!values.city || record.city === values.city)
        && (!values.industry || record.sector_group === values.industry || record.industry_sector === values.industry)
        && (!values.size || record.employee_band === values.size)
        && (!values.route || record.activity_type === values.route)
        && (!values.status || record.current_status === values.status)
        && (!values.reply || replyCategory(record) === values.reply)
        && (!values.from || record.date_sort >= values.from)
        && (!values.to || record.date_sort <= values.to);
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    const count = document.querySelector("#visible-count");
    if (count) count.textContent = String(visible);
    const empty = document.querySelector("#empty-state");
    if (empty) empty.hidden = visible !== 0;
  }

  function configure() {
    const reply = document.querySelector("#reply-filter");
    if (reply) reply.innerHTML = `<option value="">All email outcomes</option><option value="progressing">Positive reply / progressing</option><option value="future">Positive reply — no role now, CV retained</option><option value="referral">Referral / new contact supplied</option><option value="no-opening">Courteous reply — no current opening</option><option value="not-fit">Reply — not a fit / experience mismatch</option><option value="unsuccessful">Advertised-role application unsuccessful</option><option value="automated">Automatic reply / out of office</option><option value="awaiting">No substantive reply yet</option>`;
    const status = document.querySelector("#status-filter");
    if (status) Array.from(status.options).forEach((option) => {
      if (option.value === "Active") option.textContent = "Still active / awaiting outcome";
      if (option.value === "Application Closed") option.textContent = "Application unsuccessful / process ended";
      if (option.value === "Closed by Andrew") option.textContent = "Closed / withdrawn by Andrew";
    });
    const controls = document.querySelector(".controls");
    if (controls && !controls.dataset.replyFilterFixed) {
      controls.dataset.replyFilterFixed = "true";
      controls.addEventListener("input", () => setTimeout(filterRows, 0));
      controls.addEventListener("change", () => setTimeout(filterRows, 0));
    }
  }

  function start() {
    if (typeof state === "undefined" || !Array.isArray(state.records) || !state.records.length) return setTimeout(start, 100);
    if (!state.records.some((record) => record.id === amber.id)) state.records.push(amber);
    state.records = state.records.map((record) => ({ ...record, ...(updates[record.id] || {}) }));
    state.records.sort((a, b) => (b.date_sort || "").localeCompare(a.date_sort || "") || Number(b.id || 0) - Number(a.id || 0));
    renderSummary();
    render();
    configure();
    document.querySelectorAll("#applications-body tr").forEach((row) => {
      const record = findRecord(row);
      const flow = row.querySelector(".progress-flow");
      if (record && flow) flow.textContent = progressLabel(record);
    });
    setTimeout(filterRows, 0);
  }

  start();
})();