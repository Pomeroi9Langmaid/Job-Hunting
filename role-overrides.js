const roleOverrides = {
  "38": {
    job_url: "https://www.linkedin.com/jobs/view/4436367645",
    contact_name: "Malin Nordmark",
    contact_title: "Associate Consultant, Navigio",
    contacted_date: "6 Aug 2026",
    current_status: "Active",
    route_reason: "Applied through LinkedIn. Navigio is handling the recruitment search for Surikat.",
    notes: "Hybrid, full-time Sales Lead in Gothenburg. Player-coach executive-team role: personally generate and close complex enterprise deals while building Surikat's commercial team, sales process and culture. Surikat provides mission-critical SaaS for ports, terminals and transport logistics across 35 countries. The advert described a profitable business with approximately SEK 100m revenue, backed by Bridgepoint since 2024, with a five-year ambition to more than double or triple. Core requirements: complex consultative B2B sales, long sales cycles, senior stakeholder management, emerging leadership and the drive to build a commercial function from scratch. Maritime or logistics experience is a bonus, not mandatory. The package includes executive-team membership and potential co-investment. Andrew's relevant evidence: average ArrivalGuides sale approximately EUR 50,000 per year on a three-year auto-renewing contract, equivalent to approximately EUR 150,000 initial contract value; personally managed international opportunities from prospecting and discovery through demonstrations, proposals, negotiation, contract and signature. At Padani, built and trained a small sales team that helped nearly double turnover in the first year, after which he was invited to become a partner. At Theo Fennell, led a small team of already experienced salespeople. Applied 17 July 2026; LinkedIn recorded the application as viewed on 4 August 2026. Malin Nordmark of Navigio contacted Andrew on 6 August 2026 to arrange an initial conversation. Email: malin.nordmark@navigio.se. LinkedIn job ID 4436367645."
  }
};

function applyRoleOverrides() {
  if (typeof state === "undefined" || !Array.isArray(state.records) || state.records.length === 0) {
    window.setTimeout(applyRoleOverrides, 100);
    return;
  }

  let changed = false;
  state.records = state.records.map((record) => {
    const override = roleOverrides[record.id];
    if (!override) return record;
    changed = true;
    return { ...record, ...override };
  });

  if (changed && typeof render === "function") {
    render();
  }
}

applyRoleOverrides();
