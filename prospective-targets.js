(() => {
  const originalContactMarkup = contactMarkup;
  const originalJobAdMarkup = jobAdMarkup;

  function normaliseCompanyName(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(ab|group|sweden|technologies|technology)\b/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  contactMarkup = function unifiedContactMarkup(record) {
    if (record.activity_type === "Prospective Target" && record.contact_name) {
      const title = record.contact_title
        ? `<span class="cell-note">${escapeHtml(record.contact_title)}</span>`
        : "";
      const emailLine = record.contact_email
        ? `<span class="cell-note"><a href="mailto:${escapeHtml(record.contact_email)}">${escapeHtml(record.contact_email)}</a></span>`
        : `<span class="cell-note email-needs-sourcing">${escapeHtml(record.email_status || "Email needs sourcing")}</span>`;
      return `${escapeHtml(record.contact_name)}${title}${emailLine}`;
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
      : `${row.email_status || "Email needs sourcing"}.`;
    const enrichmentNote = row.contact_enrichment_note
      ? ` Contact review: ${row.contact_enrichment_note}`
      : "";

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
      notes: `${row.fit_summary} Careers review: ${row.current_opening_review} ${emailNote}${enrichmentNote}`,
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

  async function fetchCsv(file) {
    const response = await fetch(file, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${file} (${response.status})`);
    return parseCsv(await response.text());
  }

  function applyContactEnrichment(rows, enrichments) {
    const enrichmentByCompany = new Map(
      enrichments.map((entry) => [normaliseCompanyName(entry.company), entry]),
    );

    return rows.map((row) => {
      const enrichment = enrichmentByCompany.get(normaliseCompanyName(row.company));
      if (!enrichment) return row;

      const enriched = { ...row };
      enriched.contact_action = String(enrichment.action || "apply").toLowerCase();
      enriched.contact_enrichment_note = enrichment.review_note || "";

      if (enrichment.action === "retain") {
        enriched.email_status = "No professional email found in Genesy on 31 Jul 2026";
      } else if (enrichment.professional_email) {
        enriched.contact_email = enrichment.professional_email;
        enriched.email_status = "Professional email sourced via Genesy on 31 Jul 2026";
      }

      if (enrichment.linkedin_profile_url) {
        enriched.contact_source_url = enrichment.linkedin_profile_url;
      }
      enriched.verified_date = "2026-07-31";

      return enriched;
    });
  }

  async function loadTargetRows() {
    const files = [
      "data/vetted-speculative-targets.csv",
      "data/vetted-speculative-targets-stockholm-1.csv",
      "data/vetted-speculative-targets-stockholm-2.csv",
      "data/vetted-speculative-targets-expanded-gothenburg.csv",
      "data/vetted-speculative-targets-expanded-stockholm.csv",
    ];

    const [targetSets, enrichments] = await Promise.all([
      Promise.all(files.map(fetchCsv)),
      fetchCsv("data/contact-enrichment.csv"),
    ]);

    return applyContactEnrichment(targetSets.flat(), enrichments);
  }

  async function replaceProspectiveTargets() {
    if (typeof state === "undefined" || state.records.length === 0) {
      window.setTimeout(replaceProspectiveTargets, 75);
      return;
    }

    try {
      const rows = await loadTargetRows();

      // Applications, direct approaches and already-sent speculative emails remain historical truth.
      // Legacy uncontacted targets are replaced by the fully reviewed Gothenburg/Stockholm queue.
      const historicalRecords = state.records.filter(
        (record) => record.activity_type !== "Prospective Target",
      );
      const seenCompanies = new Set(
        historicalRecords.map((record) => normaliseCompanyName(record.company)),
      );

      const additions = rows
        .filter((row) => row.outreach_status && row.outreach_status.toLowerCase().includes("ready"))
        .filter((row) => row.contact_action !== "hold")
        .filter((row) => {
          const key = normaliseCompanyName(row.company);
          if (!key || seenCompanies.has(key)) return false;
          seenCompanies.add(key);
          return true;
        })
        .map(mapTarget);

      state.records = [...historicalRecords, ...additions].sort(
        (a, b) => b.date_sort.localeCompare(a.date_sort) || String(b.id).localeCompare(String(a.id)),
      );

      addMissingIndustryOptions();
      renderSummary();
      render();
    } catch (error) {
      console.error("Could not replace prospective targets with the reviewed queue", error);
    }
  }

  replaceProspectiveTargets();
})();
