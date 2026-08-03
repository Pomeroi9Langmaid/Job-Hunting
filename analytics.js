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

  const pct = (n, d) => d ? `${Math.round((n / d) * 100)}%` : "—";
  const closed = (r) => r.current_status === "Application Closed";
  const interviewed = (r) => Number(r.interview_count || 0) > 0;
  const yes = (value) => String(value).toLowerCase() === "yes";

  const metric = (label, value, note = "") => `
    <article class="analytics-metric"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ""}</article>`;

  const bar = (label, value, total) => `
    <div class="analytics-bar-row"><div><span>${label}</span><strong>${value}</strong></div><div class="analytics-track"><i style="width:${total ? Math.max(3, (value / total) * 100) : 0}%"></i></div></div>`;

  async function renderAnalytics() {
    const root = document.querySelector("#analytics-dashboard");
    if (!root) return;
    try {
      const [applicationsResponse, repliesResponse] = await Promise.all([
        fetch("data/applications.csv", { cache: "no-store" }),
        fetch("data/replies.csv", { cache: "no-store" }),
      ]);
      if (!applicationsResponse.ok) throw new Error("Application analytics data could not be loaded");
      if (!repliesResponse.ok) throw new Error("Reply analytics data could not be loaded");

      const records = parseCsv(await applicationsResponse.text());
      const replies = parseCsv(await repliesResponse.text());
      const applications = records.filter((r) => r.activity_type === "Open Role Application");
      const direct = records.filter((r) => r.activity_type === "Direct Role Outreach");
      const speculative = records.filter((r) => r.activity_type === "Speculative Outreach");
      const contacted = [...applications, ...direct, ...speculative];
      const interviews = contacted.filter(interviewed);
      const appClosed = applications.filter(closed);

      const specReplyRows = replies.filter((r) => r.route === "Speculative Outreach" && r.response_type === "Personal reply" && !yes(r.automated));
      const positiveReplies = specReplyRows.filter((r) => yes(r.positive_future_facing));
      const progressedReplies = specReplyRows.filter((r) => yes(r.conversation_progressed));
      const definitiveNo = specReplyRows.filter((r) => r.classification === "Definitive no");
      const specificMismatch = specReplyRows.filter((r) => r.classification === "Specific mismatch");
      const noCurrentOpening = specReplyRows.filter((r) => ["No current opening", "CV retained", "Keep in touch"].includes(r.classification));
      const bounces = replies.filter((r) => r.response_type === "Delivery failure");
      const duplicateFlags = replies.filter((r) => r.response_type === "Duplicate send");

      const responseGroups = [
        ["Conversation progressed", progressedReplies.length],
        ["Positive / future-facing", positiveReplies.length - progressedReplies.length],
        ["No current opening / CV retained", noCurrentOpening.length],
        ["Specific mismatch", specificMismatch.length],
        ["Definitive no", definitiveNo.length],
        ["No substantive reply recorded", Math.max(0, speculative.length - specReplyRows.length)],
      ];
      const maxGroup = Math.max(1, ...responseGroups.map((g) => g[1]));

      root.innerHTML = `
        <div class="analytics-heading">
          <div><p class="eyebrow">LIVE ANALYSIS</p><h2>Job-search performance</h2><p>Calculated from tracker records plus an explicit verified reply log. Awaiting-response status is never counted as a reply.</p></div>
          <span class="analytics-live">AUTO-UPDATING</span>
        </div>
        <div class="analytics-metrics">
          ${metric("Applications", applications.length, `${appClosed.length} closed`)}
          ${metric("Interview processes", interviews.length, `${pct(interviews.length, applications.length + direct.length)} of role-led approaches`)}
          ${metric("Speculative companies", speculative.length, "unique tracker records")}
          ${metric("Personal replies", specReplyRows.length, `${pct(specReplyRows.length, speculative.length)} verified response rate`)}
          ${metric("Positive / future-facing", positiveReplies.length, `${pct(positiveReplies.length, specReplyRows.length)} of verified replies`)}
          ${metric("Data-quality flags", bounces.length + duplicateFlags.length, `${bounces.length} bounce · ${duplicateFlags.length} duplicate-company flags`)}
        </div>
        <div class="analytics-grid">
          <article class="analytics-panel">
            <h3>Route performance</h3>
            ${bar("Advertised applications", applications.length, contacted.length)}
            ${bar("Direct role outreach", direct.length, contacted.length)}
            ${bar("Speculative outreach", speculative.length, contacted.length)}
          </article>
          <article class="analytics-panel">
            <h3>Verified speculative response quality</h3>
            ${responseGroups.map(([label, value]) => bar(label, value, maxGroup)).join("")}
          </article>
          <article class="analytics-panel analytics-insight">
            <h3>Meaningful reading</h3>
            <p>${specReplyRows.length < 20 ? "The verified reply sample is still too small for dependable conclusions about sectors, locations or recipient seniority." : "The verified reply sample is large enough to begin comparing sectors, locations and recipient seniority."}</p>
            <p>Automatic acknowledgements, out-of-office messages, delivery failures and duplicate sends are excluded from personal-reply rates.</p>
            <p>Generic rejections remain generic. The dashboard uses only explicitly recorded reply classifications.</p>
          </article>
        </div>`;
    } catch (error) {
      root.innerHTML = `<div class="load-error">${error.message}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", renderAnalytics);
})();
