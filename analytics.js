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
  const pct = (n, d) => d ? `${((n / d) * 100).toFixed(1).replace(/\.0$/, "")}%` : "—";
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

  const bar = ({ key, label, value, total, tone }) => `
    <button type="button" class="analytics-bar-row analytics-bar-row--${esc(tone)}" data-reply-group="${esc(key)}" aria-label="Open ${value} ${esc(label)} replies">
      <div class="analytics-bar-label"><span>${esc(label)}</span><span class="analytics-bar-action">Read replies</span><strong>${value}</strong></div>
      <div class="analytics-track"><i style="width:${total ? Math.max(value ? 3 : 0, (value / total) * 100) : 0}%"></i></div>
    </button>`;

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

  const routeCard = ({ title, kicker, primary, primaryLabel, metrics, tone = "", context = "" }) => `
    <article class="analytics-route-card ${tone}">
      <header><p>${esc(kicker)}</p><h3>${esc(title)}</h3></header>
      <div class="analytics-route-primary"><strong>${primary}</strong><span>${esc(primaryLabel)}</span></div>
      <dl>${metrics.map(([label, value, note]) => `
        <div><dt>${esc(label)}</dt><dd>${value}${note ? `<small>${esc(note)}</small>` : ""}</dd></div>`).join("")}</dl>
      ${context ? `<div class="analytics-route-context">${context}</div>` : ""}
    </article>`;

  const replyGroupKey = (r) => {
    if (yes(r.conversation_progressed)) return "progressed";
    if (yes(r.positive_future_facing)) return "positive";
    if (r.classification === "Specific mismatch") return "mismatch";
    if (r.classification === "Definitive no") return "negative";
    return "neutral";
  };

  const nl2br = (value) => esc(value).replaceAll("\n", "<br>");

  async function renderAnalytics() {
    const root = document.querySelector("#analytics-dashboard");
    if (!root) return;
    try {
      const [applicationsResponse, repliesResponse, companiesResponse, replyMessagesResponse] = await Promise.all([
        fetch("data/applications.csv", { cache: "no-store" }),
        fetch("data/replies.csv", { cache: "no-store" }),
        fetch("data/companies.csv", { cache: "no-store" }),
        fetch("data/reply-messages.json", { cache: "no-store" }),
      ]);
      if (!applicationsResponse.ok) throw new Error("Application analytics data could not be loaded");
      if (!repliesResponse.ok) throw new Error("Reply analytics data could not be loaded");
      if (!companiesResponse.ok) throw new Error("Company analytics data could not be loaded");

      const baseRecords = parseCsv(await applicationsResponse.text());
      const existingIds = new Set(baseRecords.map((r) => String(r.id)));
      const additions = typeof roleAdditions !== "undefined"
        ? roleAdditions.filter((r) => !existingIds.has(String(r.id)))
        : [];
      const records = [...baseRecords, ...additions].map((r) => (typeof roleOverrides !== "undefined" && roleOverrides[r.id]) ? { ...r, ...roleOverrides[r.id] } : r);
      const replies = parseCsv(await repliesResponse.text());
      const companies = parseCsv(await companiesResponse.text());
      const replyMessages = replyMessagesResponse.ok ? await replyMessagesResponse.json() : [];
      const companyMap = new Map(companies.map((r) => [r.company, r]));
      const messageMap = new Map(replyMessages.map((r) => [`${r.company}::${r.response_date}`, r]));

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
      const progressedReplies = specReplyRows.filter((r) => yes(r.conversation_progressed));
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

      const groupDefinitions = [
        { key: "progressed", label: "Conversation progressed", tone: "progressed" },
        { key: "positive", label: "Positive / future-facing", tone: "positive" },
        { key: "neutral", label: "No opening / timing constraint", tone: "neutral" },
        { key: "mismatch", label: "Specific mismatch", tone: "mismatch" },
        { key: "negative", label: "Definitive no", tone: "negative" },
      ];
      const responseGroups = groupDefinitions.map((group) => ({
        ...group,
        rows: specReplyRows.filter((r) => replyGroupKey(r) === group.key),
      }));
      const maxGroup = Math.max(1, ...responseGroups.map((g) => g.rows.length));

      const activeInterviewRows = interviewRows.filter(isActive);
      const route1Rate = pct(roleInterviewRows.length, applications.length);
      const route2ReplyRate = pct(specReplyRows.length, speculative.length);
      const route2InterviewRate = pct(specInterviewRows.length, speculative.length);
      const comparison = `Route 1 is converting ${route1Rate} of advertised applications to Interview #1, close to the current large-sample 6–7% benchmark. Route 2 has a ${route2ReplyRate} verified personal-reply rate and has created ${specInterviewRows.length} interview-stage conversation${specInterviewRows.length === 1 ? "" : "s"} from companies where no vacancy was advertised. Its ${route2InterviewRate} interview-creation rate is therefore not an apples-to-apples comparison with Route 1.`;

      root.innerHTML = `
        <div class="analytics-heading">
          <div>
            <p class="eyebrow">CURRENT PICTURE</p>
            <h2>What is actually producing conversations?</h2>
            <p>Applications and speculative outreach are separate funnels below. Each route is now shown against the right context rather than treating the percentages as equivalent.</p>
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
              ["Reached Interview #1", roleInterviewRows.length, `${route1Rate} of applications`],
              ["Reached Interview #2", roleInterview2Rows.length, "later-stage processes"],
              ["Still active", roleActive.length, "not recorded as closed"],
              ["Closed", roleClosed.length, "closed or withdrawn processes"],
            ],
            context: `
              <span class="analytics-context-label">ADVERTISED-JOB BENCHMARK</span>
              <p><strong>${route1Rate} → Interview #1.</strong> Current large-sample job-seeker data puts a comparable advertised-application rate at roughly <strong>6–7%</strong>.</p>
              <a href="https://huntr.co/research/job-search-trends-q1-2026" target="_blank" rel="noopener">Huntr Q1 2026 source ↗</a>`,
          })}
          ${routeCard({
            kicker: "ROUTE 2",
            title: "Speculative email outreach",
            primary: speculative.length,
            primaryLabel: "companies emailed · no advertised vacancy required",
            tone: "analytics-route-card--speculative",
            metrics: [
              ["Personal replies", specReplyRows.length, `${route2ReplyRate} verified response rate`],
              ["Conversation progressed", progressedReplies.length, "reply led to a meaningful next step"],
              ["Reached Interview #1", specInterviewRows.length, `${route2InterviewRate} opportunity-creation rate`],
              ["Reached Interview #2", specInterview2Rows.length, "later-stage speculative processes"],
              ["Active interview processes", specActive.filter(reachedInterview).length, "currently live"],
            ],
            context: `
              <span class="analytics-context-label analytics-context-label--speculative">NO ADVERTISED VACANCY</span>
              <p><strong>${route2ReplyRate} personal replies.</strong> That sits inside the indicative <strong>5–15%</strong> range reported for well-targeted job-seeker cold email.</p>
              <p><strong>${specInterviewRows.length} interview-stage conversation${specInterviewRows.length === 1 ? "" : "s"} created from zero advertised roles.</strong> The ${route2InterviewRate} figure is an opportunity-creation rate, not a direct comparator with Route 1; there is no dependable like-for-like interview benchmark for this exact funnel.</p>
              <p class="analytics-context-market">Swedish context: <strong>20.3%</strong> of Q1 2026 job openings were being recruited through methods other than advertising.</p>
              <div class="analytics-context-links"><a href="https://pitchhired.com/blog/cold-email-reply-rates-job-search-data" target="_blank" rel="noopener">Cold-email context ↗</a><a href="https://www.scb.se/en/finding-statistics/statistics-by-subject-area/labour-market/labour-force-demand/job-openings-and-recruitment-needs/pong/statistical-news/job-openings-and-recruitment-needs-1st-quarter-2026/?menu=open" target="_blank" rel="noopener">Statistics Sweden ↗</a></div>`,
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
          <article class="analytics-panel analytics-reply-quality">
            <div class="analytics-panel-heading analytics-panel-heading--compact">
              <div><h3>Speculative reply quality</h3><p>One reply, one outcome bucket. Click any bar to read the underlying responses.</p></div>
              <span class="analytics-click-hint">CLICK TO OPEN</span>
            </div>
            ${responseGroups.map((group) => bar({ key: group.key, label: group.label, value: group.rows.length, total: maxGroup, tone: group.tone })).join("")}
          </article>
          <article class="analytics-panel analytics-insight">
            <h3>What the numbers say</h3>
            <p>${esc(comparison)}</p>
            <p>For speculative outreach, the strongest signal is whether an unsolicited approach creates a real conversation despite there being no vacancy to apply for. That is why the dashboard now gives the absence of an advertised role explicit precedence.</p>
            <p>Automatic replies, out-of-office messages, delivery failures and duplicate sends remain excluded from personal-reply rates. Current data-quality flags: ${bounces.length} bounce${bounces.length === 1 ? "" : "s"} and ${duplicateFlags.length} duplicate-send flag${duplicateFlags.length === 1 ? "" : "s"}.</p>
          </article>
        </div>

        <div class="analytics-source-note">
          <strong>Benchmark note.</strong> Huntr Q1 2026 covers 139,927 applications from 25,635 job seekers; its 21–50 application cohort converted at 6.96% and one application to a company at 6.07%. The 5–15% cold-email reply range is an indicative third-party job-seeker benchmark rather than official labour-market data. Statistics Sweden reported 29,200 of 143,600 Q1 2026 openings were recruited through methods other than advertising. These figures provide context; they are not equivalent cohorts.
        </div>

        <div class="analytics-reply-backdrop" data-reply-close hidden></div>
        <aside class="analytics-reply-drawer" id="analytics-reply-drawer" aria-hidden="true" aria-labelledby="analytics-reply-title">
          <div class="analytics-reply-drawer-head">
            <div><p class="eyebrow">SPECULATIVE REPLY DETAIL</p><h3 id="analytics-reply-title">Replies</h3><p id="analytics-reply-subtitle"></p></div>
            <button type="button" class="analytics-reply-close" data-reply-close aria-label="Close reply detail">×</button>
          </div>
          <div class="analytics-reply-privacy">Reply wording is preserved for easy review. Signatures, phone/email details and your quoted outbound email are omitted from this public dashboard copy.</div>
          <div class="analytics-reply-list" id="analytics-reply-list"></div>
        </aside>`;

      const drawer = root.querySelector("#analytics-reply-drawer");
      const backdrop = root.querySelector(".analytics-reply-backdrop");
      const replyTitle = root.querySelector("#analytics-reply-title");
      const replySubtitle = root.querySelector("#analytics-reply-subtitle");
      const replyList = root.querySelector("#analytics-reply-list");
      const closeButton = root.querySelector(".analytics-reply-close");

      const closeDrawer = () => {
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        backdrop.hidden = true;
        document.body.classList.remove("analytics-drawer-open");
      };

      const openDrawer = (key) => {
        const group = responseGroups.find((item) => item.key === key);
        if (!group) return;
        const rows = [...group.rows].sort((a, b) => String(b.response_date).localeCompare(String(a.response_date)) || a.company.localeCompare(b.company));
        replyTitle.textContent = group.label;
        replySubtitle.textContent = `${rows.length} verified personal repl${rows.length === 1 ? "y" : "ies"}`;
        replyList.innerHTML = rows.map((r) => {
          const archived = messageMap.get(`${r.company}::${r.response_date}`);
          const message = archived?.message || "Exact response text has not yet been archived for this reply.";
          return `<article class="analytics-reply-card analytics-reply-card--${esc(group.tone)}">
            <header>
              <div><strong>${esc(r.company)}</strong><small>${esc(formatDate(r.response_date))}</small></div>
              <span>${esc(r.classification || group.label)}</span>
            </header>
            ${archived ? `<p class="analytics-reply-meta">${esc(archived.sender || "Sender not recorded")} · ${esc(archived.subject || "Subject not recorded")}</p>` : ""}
            <blockquote>${nl2br(message)}</blockquote>
            <div class="analytics-reply-note"><strong>Tracker note:</strong> ${esc(r.notes || "No additional reason recorded.")}</div>
          </article>`;
        }).join("");
        backdrop.hidden = false;
        drawer.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
        document.body.classList.add("analytics-drawer-open");
        closeButton.focus();
      };

      root.querySelectorAll("[data-reply-group]").forEach((button) => {
        button.addEventListener("click", () => openDrawer(button.dataset.replyGroup));
      });
      root.querySelectorAll("[data-reply-close]").forEach((button) => button.addEventListener("click", closeDrawer));
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
      });
    } catch (error) {
      root.innerHTML = `<div class="load-error">${esc(error.message)}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", renderAnalytics);
})();