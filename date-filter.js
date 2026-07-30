(() => {
  const originalContactMarkup = contactMarkup;
  const originalJobAdMarkup = jobAdMarkup;

  function normaliseCompanyName(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  contactMarkup = function unifiedContactMarkup(record) {
    if (
      record.activity_type === "Prospective Target" &&
      record.contact_name &&
      !record.contact_email
    ) {
      const title = record.contact_title
        ? `<span class="cell-note">${escapeHtml(record.contact_title)}</span>`
        : "";
      return `${escapeHtml(record.contact_name)}${title}<span class="cell-note email-needs-sourcing">Email needs sourcing</span>`;
    }

    return originalContactMarkup(record);
  };

  jobAdMarkup = function unifiedJobAdMarkup(record) {
    if (record.activity_type === "Prospective Target" && record.job_url) {
      return `<a class="job-link" href="${escapeHtml(record.job_url)}" target="_blank" rel="noreferrer" aria-label="View the careers page for ${escapeHtml(record.company)}">VIEW CAREERS</a>`;
    }

    return originalJobAdMarkup(record);
  };

  function addMissingIndustryOptions() {
    const select = document.querySelector("#industry-filter");
    if (!select) return;

    const existing = new Set(Array.from(select.options).map((option) => option.value));
    const values = [...new Set(state.records.map((record) => record.sector_group).filter(Boolean))]
      .filter((value) => !existing.has(value))
      .sort();

    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  }

  function mapTarget(row, index) {
    const emailNote = row.contact_email
      ? `Contact email available: ${row.contact_email}.`
      : "Email needs sourcing in Genesys before outreach.";

    return {
      id: `prospective-${index + 1}-${normaliseCompanyName(row.company)}`,
      activity_date: "30 Jul 2026",
      date_sort: row.verified_date || "2026-07-30",
      company: row.company,
      city: row.city,
      job_title: `International business development / partnerships — Priority ${row.priority}`,
      activity_type: "Prospective Target",
      job_url: row.careers_url,
      contact_name: row.contact_name,
      contact_title: row.contact_title,
      contact_email: row.contact_email,
      contacted_date: "",
      current_status: "Not Contacted",
      outcome_date: "",
      interview_count: 0,
      interview_details: "",
      outcome: "",
      route_reason: "Vetted prospective target. No application or speculative email sent.",
      notes: `${row.fit_summary} Careers review: ${row.current_opening_review} ${emailNote}`,
      interview_steps: "",
      sector_group: row.sector,
      industry_sector: row.sector,
      employee_band: "",
      employee_estimate: "",
      priority: row.priority,
      email_status: row.email_status,
      company_url: row.company_url,
      contact_source_url: row.contact_source_url,
    };
  }

  async function mergeProspectiveTargets() {
    if (typeof state === "undefined" || state.records.length === 0) {
      window.setTimeout(mergeProspectiveTargets, 75);
      return;
    }

    try {
      const response = await fetch("data/vetted-speculative-targets.csv", { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load vetted targets (${response.status})`);

      const rows = parseCsv(await response.text());
      const existingCompanies = new Set(state.records.map((record) => normaliseCompanyName(record.company)));
      const additions = rows
        .filter((row) => row.outreach_status && row.outreach_status.toLowerCase().includes("ready"))
        .filter((row) => !existingCompanies.has(normaliseCompanyName(row.company)))
        .map(mapTarget);

      if (additions.length === 0) return;

      state.records = [...state.records, ...additions].sort(
        (a, b) => b.date_sort.localeCompare(a.date_sort) || String(b.id).localeCompare(String(a.id)),
      );

      addMissingIndustryOptions();
      renderSummary();
      render();
    } catch (error) {
      console.error("Could not merge vetted prospective targets into the main tracker", error);
    }
  }

  mergeProspectiveTargets();
})();
