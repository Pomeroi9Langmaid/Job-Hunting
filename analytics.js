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
  const text = (r) => `${r.current_status} ${r.outcome} ${r.notes} ${r.route_reason}`.toLowerCase();
  const closed = (r) => r.current_status === "Application Closed";
  const interviewed = (r) => Number(r.interview_count || 0) > 0;
  const substantiveReply = (r) => /reply|response|responded|cv on file|keep.*cv|keep in touch|no suitable|no opening|no position|not growing|future/.test(text(r));
  const positiveReply = (r) => /cv on file|keep.*cv|keep in touch|future|reconnect|something.*comes up|commercial team grows/.test(text(r));
  const bounce = (r) => /bounce|delivery failure|address.*not found|undeliver/.test(text(r));
  const duplicate = (r) => /duplicate/.test(text(r));

  const metric = (label, value, note = "") => `
    <article class="analytics-metric"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ""}</article>`;

  const bar = (label, value, total) => `
    <div class="analytics-bar-row"><div><span>${label}</span><strong>${value}</strong></div><div class="analytics-track"><i style="width:${total ? Math.max(3, (value / total) * 100) : 0}%"></i></div></div>`;

  async function renderAnalytics() {
    const root = document.querySelector("#analytics-dashboard");
    if (!root) return;
    try {
      const response = await fetch("data/applications.csv", { cache: "no-store" });
      if (!response.ok) throw new Error("Analytics data could not be loaded");
      const records = parseCsv(await response.text());
      const applications = records.filter((r) => r.activity_type === "Open Role Application");
      const direct = records.filter((r) => r.activity_type === "Direct Role Outreach");
      const speculative = records.filter((r) => r.activity_type === "Speculative Outreach");
      const contacted = [...applications, ...direct, ...speculative];
      const interviews = contacted.filter(interviewed);
      const appClosed = applications.filter(closed);
      const specReplies = speculative.filter(substantiveReply);
      const specPositive = speculative.filter(positiveReply);
      const bounces = contacted.filter(bounce);
      const duplicates = contacted.filter(duplicate);

      const responseGroups = [
        ["Positive / future-facing", specPositive.length],
        ["Other substantive replies", Math.max(0, specReplies.length - specPositive.length)],
        ["No substantive reply recorded", Math.max(0, speculative.length - specReplies.length)],
      ];
      const maxGroup = Math.max(1, ...responseGroups.map((g) => g[1]));

      root.innerHTML = `
        <div class="analytics-heading">
          <div><p class="eyebrow">LIVE ANALYSIS</p><h2>Job-search performance</h2><p>Calculated automatically from the verified tracker data whenever the microsite refreshes.</p></div>
          <span class="analytics-live">AUTO-UPDATING</span>
        </div>
        <div class="analytics-metrics">
          ${metric("Applications", applications.length, `${appClosed.length} closed`)}
          ${metric("Interview processes", interviews.length, `${pct(interviews.length, applications.length + direct.length)} of role-led approaches`)}
          ${metric("Speculative companies", speculative.length, "unique tracker records")}
          ${metric("Personal replies", specReplies.length, `${pct(specReplies.length, speculative.length)} response rate recorded`)}
          ${metric("Positive / future-facing", specPositive.length, `${pct(specPositive.length, specReplies.length)} of substantive replies`)}
          ${metric("Data-quality flags", bounces.length + duplicates.length, `${bounces.length} bounce · ${duplicates.length} duplicate flag`)}
        </div>
        <div class="analytics-grid">
          <article class="analytics-panel">
            <h3>Route performance</h3>
            ${bar("Advertised applications", applications.length, contacted.length)}
            ${bar("Direct role outreach", direct.length, contacted.length)}
            ${bar("Speculative outreach", speculative.length, contacted.length)}
          </article>
          <article class="analytics-panel">
            <h3>Speculative response quality</h3>
            ${responseGroups.map(([label, value]) => bar(label, value, maxGroup)).join("")}
          </article>
          <article class="analytics-panel analytics-insight">
            <h3>Meaningful reading</h3>
            <p>${speculative.length < 20 ? "The speculative sample is still too small for a dependable sector or recipient-level conclusion." : "The sample is large enough to begin comparing sectors, locations and recipient seniority."}</p>
            <p>Automated acknowledgements and out-of-office messages are excluded unless the tracker records them as substantive outcomes.</p>
            <p>Rejection reasons remain factual: generic rejections are not converted into invented explanations.</p>
          </article>
        </div>`;
    } catch (error) {
      root.innerHTML = `<div class="load-error">${error.message}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", renderAnalytics);
})();
