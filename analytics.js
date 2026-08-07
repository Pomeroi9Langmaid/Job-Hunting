(() => {
  const parseCsv = (text) => {
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i], n = text[i + 1];
      if (c === '"' && quoted && n === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = !quoted;
      else if (c === "," && !quoted) { row.push(field); field = ""; }
      else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && n === "\n") i += 1;
        row.push(field);
        if (row.some(Boolean)) rows.push(row);
        row = []; field = "";
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const [headers, ...data] = rows;
    return data.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] || ""])));
  };

  const esc = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const pct = (n, d) => d ? `${Math.round((n / d) * 100)}%` : "—";
  const yes = (value) => String(value).toLowerCase() === "yes";
  const interviewCount = (r) => Number(r.interview_count || 0);
  const reachedInterview = (r) => interviewCount(r) > 0;
  const isActive = (r) => r.current_status === "Active";
  const isClosed = (r) => ["Application Closed", "Closed by Andrew", "Role Filled / Closed"].includes(r.current_status);

  const formatDate = (iso) => {
    if (!iso) return "—";
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return esc(iso);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  };

  const bar = (label, value, total) => `
    <div class="analytics-bar-row">
      <div><span>${esc(label)}</span><strong>${value}</strong></div>
      <div class="analytics-track"><i style="width:${total ? Math.max(value ? 3 : 0, (value / total) * 100) : 0}%"></i></div>
    </div>`;

  const routeLabel = (r) => {
    if (r.activity_type === "Open Role Application") return "Specific job application";
    if (r.activity_type === "Speculative Outreach") return "Speculative email";
    if (r.activity_type === "Direct Role Outreach") return "Specific role · direct outreach";
    return r.activity_type || "Other";
  };

  const stageLabel = (r) => {
    const count = interviewCount(r);
    const steps = String(r.interview_steps || "").toUpperCase();
    if (count >= 2 && steps.includes("INFORMAL COFFEE")) return "Interview #2 scheduled · informal coffee";
    if (count === 1 && steps.includes("INTERVIEW #1 INVITED")) return "Interview #1 invited";
    if (count === 1 && steps.includes("FOLLOW-UP MEETING SCHEDULED")) return "Interview #1 complete · follow-up booked";
    return `Interview #${count}`;
  };

  const routeCard = ({ title, kicker, primary, primaryLabel, metrics, tone = "" }) => `
    <article class="analytics-route-card ${tone}">
      <header><p>${esc(kicker)}</p><h3>${esc(title)}</h3></header>
      <div class="analytics-route-primary"><strong>${primary}</strong><span>${esc(primaryLabel)}</span></div>
      <dl>${metrics.map(([label, value, note]) => `
        <div><dt>${esc(label)}</dt><dd>${value}${note ? `<small>${esc(note)}</small>` : ""}</dd></div>`).join("")}</dl>
    </article>`;

  async function renderAnalytics() {
    const root = document.querySelector("#analytics-dashboard");
    if (!root) return;
    try {
      const [applicationsResponse, repliesResponse, companiesResponse] = await Promise.all([
        fetch("data/applications.csv", { cache: "no-store" }),
        fetch("data/replies.csv", { cache: "no-store" }),
        fetch("data/companies.csv", { cache: "no-store" }),
      ]);
      if (!applicationsResponse.ok) throw new Error("Application analytics data could not be loaded");
      if (!repliesResponse.ok) throw new Error("Reply analytics data could not be loaded");
      if (!companiesResponse.ok) throw new Error("Company analytics data could not be loaded");

      const baseRecords = parseCsv(await applicationsResponse.text());
      const records = baseRecords.map((r) => (typeof roleOverrides !== "undefined" && roleOverrides[r.id]) ? { ...r, ...roleOverrides[r.id] } : r);
      const replies = parseCsv(await repliesResponse.text());
      const companies = parseCsv(await companiesResponse.text());
      const companyMap = new Map(companies.map((r) => [r.company, r]));

      const applications = records.filter((r) => r.activity_type === "Open Role Application");
      const direct = records.filter((r) => r.activity_type === "Direct Role Outreach");
      const speculative = records.filter((r) => r.activity_type === "Speculative Outreach");
      const contacted = [...applications, ...direct, ...speculative];

      const roleInterviewRows = applications.filter(reachedInterview);
      const roleInterview2Rows = applications.filter((r) => interviewCount(r) >= 2);
      const roleActive = applications.filter(isActive);
      const roleClosed = applications.filter(isClosed);

      const specInterviewRows = speculative.filter(reachedInterview);
      const specInterview2Rows = speculative.filter((r) => interviewCount(r) >= 2);
      const specActive = speculative.filter(isActive);
      const specReplyRows = replies.filter((r) => r.route === "Speculative Outreach" && r.response_type === "Personal reply" && !yes(r.automated));
      const positiveReplies = specReplyRows.filter((r) => yes(r.positive_future_facing));
      const progressedReplies = specReplyRows.filter((r) => yes(r.conversation_progressed));
      const definitiveNo = specReplyRows.filter((r) => r.classification === "Definitive no");
      const specificMismatch = specReplyRows.filter((r) => r.classification === "Specific mismatch");
      const noCurrentOpening = specReplyRows.filter((r) => ["No current opening", "CV retained", "Keep in touch", "Future consideration", "Location and timing mismatch"].includes(r.classification));
      const bounces = replies.filter((r) => r.response_type === "Delivery failure");
      const duplicateFlags = replies.filter((r) => r.response_type === "Duplicate send");

      const latestDate = [
        ...records.map((r) => r.date_sort),
        ...replies.map((r) => r.response_date),
      ].filter(Boolean).sort().at(-1);

      const interviewRows = contacted
        .filter(reachedInterview)
        .sort((a, b) => {
          if (isActive(a) !== isActive(b)) return isActive(a) ? -1 : 1;
          return String(b.date_sort).localeCompare(String(a.date_sort));
        });

      const responseGroups = [
        ["Conversation progressed", progressedReplies.length],
        ["Positive / future-facing", Math.max(0, positiveReplies.length - progressedReplies.length)],
        ["No current opening / keep in touch", noCurrentOpening.length],
        ["Specific mismatch", specificMismatch.length],
        ["Definitive no", definitiveNo.length],
      ];
      const maxGroup = Math.max(1, ...responseGroups.map((g) => g[1]));

      const activeInterviewRows = interviewRows.filter(isActive);
      const comparison = specInterview2Rows.length
        ? `Speculative outreach has now produced ${specInterviewRows.length} interview-stage conversations, including ${specInterview2Rows.length} process at Interview #2.`
        : specInterviewRows.length >= 2
          ? `Speculative outreach has now produced ${specInterviewRows.length} interview-stage conversations, alongside ${progressedReplies.length} verified conversations that progressed beyond a simple reply.`
          : "Speculative outreach is producing useful replies, but the interview sample is still small.";

      root.innerHTML = `
        <div class="analytics-heading">
          <div>
            <p class="eyebrow">CURRENT PICTURE</p>
            <h2>What is actually producing conversations?</h2>
            <p>Applications and speculative outreach are separate funnels below, so the route into every interview is visible rather than blended into one total.</p>
          </div>
          <span class="analytics-live">DATA THROUGH ${esc(formatDate(latestDate).toUpperCase())}</span>
        </div>

        <div class="analytics-route-grid">
          ${routeCard({
            kicker: "ROUTE 1",
            title: "Specific job applications",
            primary: applications.length,
            primaryLabel: "applications submitted",
            metrics: [
              ["Reached Interview #1", roleInterviewRows.length, `${pct(roleInterviewRows.length, applications.length)} of applications`],
              ["Reached Interview #2", roleInterview2Rows.length, "later-stage processes"],
              ["Still active", roleActive.length, "not recorded as closed"],
              ["Closed", roleClosed.length, "closed or withdrawn processes"],
            ],
          })}
          ${routeCard({
            kicker: "ROUTE 2",
            title: "Speculative email outreach",
            primary: speculative.length,
            primaryLabel: "companies emailed",
            tone: "analytics-route-card--speculative",
            metrics: [
              ["Personal replies", specReplyRows.length, `${pct(specReplyRows.length, speculative.length)} verified response rate`],
              ["Conversation progressed", progressedReplies.length, "reply led to a meaningful next step"],
              ["Reached Interview #1", specInterviewRows.length, `${pct(specInterviewRows.length, speculative.length)} of companies emailed`],
              ["Reached Interview #2", specInterview2Rows.length, "later-stage speculative processes"],
              ["Active interview processes", specActive.filter(reachedInterview).length, "currently live"],
            ],
          })}
        </div>

        <div class="analytics-route-note">
          <strong>${direct.length}</strong> additional advertised-role approaches were made directly rather than through a normal application; <strong>${direct.filter(reachedInterview).length}</strong> reached interview stage. They are kept separate so the two main funnels above stay honest.
        </div>

        <article class="analytics-panel analytics-interviews">
          <div class="analytics-panel-heading">
            <div><p class="eyebrow">INTERVIEW DETAIL</p><h3>Where the interviews came from</h3></div>
            <p>${activeInterviewRows.length} active interview-stage process${activeInterviewRows.length === 1 ? "" : "es"} now · active rows shown first</p>
          </div>
          <div class="analytics-table-wrap">
            <table class="analytics-table">
              <thead><tr><th>Company</th><th>Source</th><th>Industry</th><th>Role / context</th><th>Stage</th><th>Status</th></tr></thead>
              <tbody>${interviewRows.map((r) => {
                const company = companyMap.get(r.company) || {};
                const roleContext = r.activity_type === "Speculative Outreach" ? "Exploratory commercial conversation" : (r.job_title || "Role title not recorded");
                return `<tr class="${isActive(r) ? "is-active" : ""}">
                  <td><strong>${esc(r.company)}</strong><small>${esc(r.city || "")}</small></td>
                  <td><span class="analytics-route-pill">${esc(routeLabel(r))}</span></td>
                  <td><strong>${esc(company.sector_group || "Not classified")}</strong><small>${esc(company.industry_sector || "")}</small></td>
                  <td>${esc(roleContext)}</td>
                  <td><strong>${esc(stageLabel(r))}</strong></td>
                  <td><span class="analytics-status ${isActive(r) ? "active" : "closed"}">${esc(r.current_status || "—")}</span></td>
                </tr>`;
              }).join("")}</tbody>
            </table>
          </div>
        </article>

        <div class="analytics-grid">
          <article class="analytics-panel">
            <h3>Speculative reply quality</h3>
            ${responseGroups.map(([label, value]) => bar(label, value, maxGroup)).join("")}
          </article>
          <article class="analytics-panel analytics-insight">
            <h3>What the numbers say</h3>
            <p>${esc(comparison)}</p>
            <p>The strongest current signal is not the raw volume of outreach; it is whether a route is turning into a real conversation. That is why interview stage and progressed replies now sit next to the route that generated them.</p>
            <p>Automatic replies, out-of-office messages, delivery failures and duplicate sends remain excluded from personal-reply rates. Current data-quality flags: ${bounces.length} bounce${bounces.length === 1 ? "" : "s"} and ${duplicateFlags.length} duplicate-send flag${duplicateFlags.length === 1 ? "" : "s"}.</p>
          </article>
        </div>`;
    } catch (error) {
      root.innerHTML = `<div class="load-error">${esc(error.message)}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", renderAnalytics);
})();