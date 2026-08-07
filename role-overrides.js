const roleOverrides = {
  "38": {
    job_url: "https://www.linkedin.com/jobs/view/4436367645",
    contact_name: "Malin Nordmark",
    contact_title: "Associate Consultant, Navigio",
    contacted_date: "6 Aug 2026",
    current_status: "Active",
    interview_count: 1,
    interview_details: "Interview #1: initial recruiter call invited for the week beginning 10 August 2026; date and time not yet confirmed.",
    interview_steps: "6 Aug 2026|INTERVIEW #1 INVITED - INITIAL RECRUITER CALL",
    route_reason: "Applied through LinkedIn. Navigio is handling the recruitment search for Surikat.",
    notes: "Hybrid, full-time Sales Lead in Gothenburg. Player-coach executive-team role: personally generate and close complex enterprise deals while building Surikat's commercial team, sales process and culture. Surikat provides mission-critical SaaS for ports, terminals and transport logistics across 35 countries. The advert described a profitable business with approximately SEK 100m revenue, backed by Bridgepoint since 2024, with a five-year ambition to more than double or triple. Core requirements: complex consultative B2B sales, long sales cycles, senior stakeholder management, emerging leadership and the drive to build a commercial function from scratch. Maritime or logistics experience is a bonus, not mandatory. The package includes executive-team membership and potential co-investment. Andrew's relevant evidence: average ArrivalGuides sale approximately EUR 50,000 per year on a three-year auto-renewing contract, equivalent to approximately EUR 150,000 initial contract value; personally managed international opportunities from prospecting and discovery through demonstrations, proposals, negotiation, contract and signature. At Padani, built and trained a small sales team that helped nearly double turnover in the first year, after which he was invited to become a partner. At Theo Fennell, led a small team of already experienced salespeople. Applied 17 July 2026; LinkedIn recorded the application as viewed on 4 August 2026. Malin Nordmark of Navigio contacted Andrew on 6 August 2026 to arrange Interview #1, an initial conversation during the week beginning 10 August 2026. Date and time are not yet confirmed. Email: malin.nordmark@navigio.se. LinkedIn job ID 4436367645."
  },
  "90": {
    current_status: "Active",
    interview_count: 1,
    interview_details: "6 Aug 2026: one-hour face-to-face exploratory interview with David Bryngelsson, Founder & CEO, at CarbonCloud's Gothenburg office.",
    notes: "Email sent 3 August 2026 to David Bryngelsson at david@carboncloud.com with Andrew_Langmaid_CarbonCloud.pdf attached. Subject: Andrew Langmaid. David replied on 4 August that CarbonCloud is considering additional hands-on full-cycle commercial capacity. Andrew accepted the invitation on 5 August. The one-hour face-to-face exploratory interview took place on 6 August 2026 at 11:00 at CarbonCloud's Gothenburg office. No outcome or next step has yet been recorded.",
    interview_steps: "4 Aug 2026|EXPLORATORY INTERVIEW INVITATION;5 Aug 2026|INTERVIEW CONFIRMED FOR 6 AUGUST AT 11:00;6 Aug 2026|FACE-TO-FACE INTERVIEW WITH DAVID"
  },
  "181": {
    notes: "Email sent 3 August 2026 to Linda Nyquist-Evenrud at l.nyquist-evenrud@allgon.com with Andrew_Langmaid_Allgon.pdf attached. Subject: Andrew Langmaid. Personal reply received 5 August 2026. Linda confirmed that Allgon had no matching opening and asked the CHRO to retain Andrew's CV. Andrew sent a brief acknowledgement on 6 August 2026, thanking her for her comments and for asking the CHRO to retain his CV. Allgon careers page: https://career.allgon.com/#jobs."
  },
  "209": {
    notes: "Email sent 4 August 2026 to Patrik Rossberger at patrik.rossberger@hecksher.com with Andrew_Langmaid_Hecksher.pdf attached. Subject: Andrew Langmaid. Personal reply received 5 August 2026. Patrik confirmed that Hecksher was not currently expanding or hiring within its commercial team. Andrew sent a brief acknowledgement on 6 August 2026."
  },
  "227": {
    notes: "Email sent 5 August 2026 to Per-Arne Andersson at per-arne.andersson@svedbergsgroup.com with Andrew_Langmaid_Svedbergs_Group.pdf attached. Subject: Andrew Langmaid. Personal reply received 6 August 2026. Per-Arne confirmed that Svedbergs Group had no open position and advised Andrew to follow its companies for future vacancies. Andrew sent a brief acknowledgement on 6 August 2026 and confirmed that he would continue monitoring the group's vacancies."
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

  if (changed && typeof renderSummary === "function") {
    renderSummary();
  }

  if (changed && typeof render === "function") {
    render();
  }
}

applyRoleOverrides();
