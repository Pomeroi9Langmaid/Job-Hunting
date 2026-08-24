(() => {
  const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      const n = text[i + 1];
      if (c === '"' && quoted && n === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        quoted = !quoted;
      } else if (c === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && n === "\n") i += 1;
        row.push(field);
        if (row.some(Boolean)) rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }

    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    const [headers, ...data] = rows;
    return data.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
  };

  const esc = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const yes = (value) => String(value).toLowerCase() === "yes";
  const pct = (n, d) => d ? `${Math.round((n / d) * 100)}%` : "—";
  const monthKey = (iso) => String(iso || "").slice(0, 7);

  const monthLabel = (key) => {
    const date = new Date(`${key}-15T12:00:00`);
    return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
  };

  const longMonthLabel = (key) => {
    const date = new Date(`${key}-15T12:00:00`);
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const date = new Date(`${iso}T12:00:00`);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  };

  const monthRange = (startKey, endKey) => {
    if (!startKey || !endKey) return [];
    const [startYear, startMonth] = startKey.split("-").map(Number);
    const [endYear, endMonth] = endKey.split("-").map(Number);
    const result = [];
    let year = startYear;
    let month = startMonth;

    while (year < endYear || (year === endYear && month <= endMonth)) {
      result.push(`${year}-${String(month).padStart(2, "0")}`);
      month += 1;
      if (month === 13) {
        month = 1;
        year += 1;
      }
    }
    return result;
  };

  const sectorForRecord = (record, companyMap) => record.sector_group || companyMap.get(record.company)?.sector_group || "Not classified";

  const monthlyChart = ({ title, subtitle, series, tone }) => {
    const max = Math.max(1, ...series.map((item) => item.value));
    const current = series.at(-1) || { key: "", value: 0 };
    const previous = series.at(-2) || { key: "", value: 0 };
    const change = previous.value ? Math.round(((current.value - previous.value) / previous.value) * 100) : null;
    const changeText = change === null ? "No prior-month comparison" : `${change > 0 ? "+" : ""}${change}% vs ${monthLabel(previous.key)}`;

    return `
      <article class="trend-panel trend-month-panel trend-month-panel--${esc(tone)}">
        <header class="trend-panel-head">
          <div><p class="eyebrow">MONTHLY ACTIVITY</p><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div>
          <div class="trend-current"><strong>${current.value}</strong><span>${esc(longMonthLabel(current.key))}</span><small>${esc(changeText)}</small></div>
        </header>
        <div class="trend-month-chart" style="--month-count:${series.length}">
          ${series.map((item) => {
            const height = item.value ? Math.max(8, (item.value / max) * 100) : 0;
            return `<div class="trend-month-col" title="${esc(longMonthLabel(item.key))}: ${item.value}">
              <span class="trend-month-value">${item.value}</span>
              <div class="trend-month-track"><i style="height:${height}%"></i></div>
              <span class="trend-month-label">${esc(monthLabel(item.key))}</span>
            </div>`;
          }).join("")}
        </div>
      </article>`;
  };

  const compressRows = (rows, limit = 8) => {
    if (rows.length <= limit) return rows;
    const kept = rows.slice(0, limit - 1);
    const rest = rows.slice(limit - 1).reduce((acc, row) => ({
      sector: "Other sectors",
      live: acc.live + row.live,
      speculative: acc.speculative + row.speculative,
    }), { live: 0, speculative: 0 });
    return [...kept, rest];
  };

  async function renderTrends() {
    const root = document.querySelector("#trend-dashboard");
    if (!root) return;

    try {
      const [applicationsResponse, repliesResponse, companiesResponse] = await Promise.all([
        fetch("data/applications.csv", { cache: "no-store" }),
        fetch("data/replies.csv", { cache: "no-store" }),
        fetch("data/companies.csv", { cache: "no-store" }),
      ]);

      if (!applicationsResponse.ok || !repliesResponse.ok || !companiesResponse.ok) {
        throw new Error("Trend data could not be loaded");
      }

      const baseRecords = parseCsv(await applicationsResponse.text());
      const replies = parseCsv(await repliesResponse.text());
      const companies = parseCsv(await companiesResponse.text());
      const companyMap = new Map(companies.map((record) => [record.company, record]));

      const existingIds = new Set(baseRecords.map((record) => String(record.id)));
      const additions = typeof roleAdditions !== "undefined"
        ? roleAdditions.filter((record) => !existingIds.has(String(record.id)))
        : [];

      const records = [...baseRecords, ...additions].map((record) => {
        const override = typeof roleOverrides !== "undefined" ? roleOverrides[record.id] : null;
        return override ? { ...record, ...override } : record;
      });

      const applications = records.filter((record) => record.activity_type === "Open Role Application");
      const speculative = records.filter((record) => record.activity_type === "Speculative Outreach");
      const relevantDates = [...applications, ...speculative].map((record) => record.date_sort).filter(Boolean).sort();
      const months = monthRange(monthKey(relevantDates[0]), monthKey(relevantDates.at(-1)));

      const seriesFor = (source) => months.map((key) => ({
        key,
        value: source.filter((record) => monthKey(record.date_sort) === key).length,
      }));

      const applicationSeries = seriesFor(applications);
      const speculativeSeries = seriesFor(speculative);

      const liveApplications = applications.filter((record) => record.current_status === "Active");
      const sectorMap = new Map();
      const getSectorRow = (sector) => {
        if (!sectorMap.has(sector)) sectorMap.set(sector, { sector, live: 0, speculative: 0 });
        return sectorMap.get(sector);
      };

      liveApplications.forEach((record) => {
        getSectorRow(sectorForRecord(record, companyMap)).live += 1;
      });
      speculative.forEach((record) => {
        getSectorRow(sectorForRecord(record, companyMap)).speculative += 1;
      });

      const sectorRows = compressRows([...sectorMap.values()]
        .filter((row) => row.live || row.speculative)
        .sort((a, b) => (b.live + b.speculative) - (a.live + a.speculative) || b.live - a.live));
      const maxSectorValue = Math.max(1, ...sectorRows.flatMap((row) => [row.live, row.speculative]));

      const speculativeByCompany = new Map(speculative.map((record) => [record.company, record]));
      const speculativeCountBySector = new Map();
      speculative.forEach((record) => {
        const sector = sectorForRecord(record, companyMap);
        speculativeCountBySector.set(sector, (speculativeCountBySector.get(sector) || 0) + 1);
      });

      const positiveReplies = replies.filter((reply) =>
        reply.route === "Speculative Outreach" &&
        reply.response_type === "Personal reply" &&
        !yes(reply.automated) &&
        (yes(reply.positive_future_facing) || yes(reply.conversation_progressed))
      );

      const positiveBySector = new Map();
      positiveReplies.forEach((reply) => {
        const sourceRecord = speculativeByCompany.get(reply.company) || {};
        const sector = sectorForRecord(sourceRecord.company ? sourceRecord : { company: reply.company }, companyMap);
        if (!positiveBySector.has(sector)) positiveBySector.set(sector, { sector, positive: 0, progressed: 0 });
        const row = positiveBySector.get(sector);
        row.positive += 1;
        if (yes(reply.conversation_progressed)) row.progressed += 1;
      });

      const signalRows = [...positiveBySector.values()]
        .map((row) => ({ ...row, contacted: speculativeCountBySector.get(row.sector) || 0 }))
        .sort((a, b) => b.positive - a.positive || b.progressed - a.progressed || (b.positive / Math.max(1, b.contacted)) - (a.positive / Math.max(1, a.contacted)));
      const maxSignalCount = Math.max(1, ...signalRows.map((row) => row.positive));

      const currentKey = months.at(-1);
      const latestDate = [...records.map((record) => record.date_sort), ...replies.map((reply) => reply.response_date)].filter(Boolean).sort().at(-1);
      const currentApps = applicationSeries.at(-1)?.value || 0;
      const currentSpec = speculativeSeries.at(-1)?.value || 0;
      const currentTotal = currentApps + currentSpec;

      root.innerHTML = `
        <div class="trend-heading">
          <div>
            <p class="eyebrow">SEARCH PATTERNS</p>
            <h2>Monthly activity & sector signal</h2>
            <p>Volume shows what you are doing. Sector signal shows where the market is actually responding.</p>
          </div>
          <span class="trend-live">DATA THROUGH ${esc(formatDate(latestDate).toUpperCase())}</span>
        </div>

        <div class="trend-now-strip">
          <div><strong>${currentTotal}</strong><span>Total applications + speculative approaches in ${esc(monthLabel(currentKey))}</span></div>
          <div><strong>${liveApplications.length}</strong><span>Advertised applications currently recorded as active</span></div>
          <div><strong>${positiveReplies.length}</strong><span>Positive / future-facing speculative replies</span></div>
          <div><strong>${positiveReplies.filter((reply) => yes(reply.conversation_progressed)).length}</strong><span>Speculative replies that progressed</span></div>
        </div>

        <div class="trend-month-grid">
          ${monthlyChart({
            title: "Advertised roles applied for",
            subtitle: "Applications submitted each month since tracking began.",
            series: applicationSeries,
            tone: "role",
          })}
          ${monthlyChart({
            title: "Speculative approaches",
            subtitle: "Companies contacted without a suitable advertised vacancy.",
            series: speculativeSeries,
            tone: "speculative",
          })}
        </div>

        <div class="trend-sector-grid">
          <article class="trend-panel">
            <header class="trend-panel-head trend-panel-head--simple">
              <div><p class="eyebrow">INDUSTRY MIX</p><h3>Where the live search is concentrated</h3><p>Active advertised applications versus all speculative approaches, grouped by the tracker's sector classification.</p></div>
            </header>
            <div class="trend-legend"><span class="trend-legend-role">Active advertised</span><span class="trend-legend-speculative">Speculative</span></div>
            <div class="trend-sector-list">
              ${sectorRows.map((row) => `
                <div class="trend-sector-row">
                  <strong>${esc(row.sector)}</strong>
                  <div class="trend-sector-bars">
                    <div class="trend-sector-line trend-sector-line--role"><i style="width:${row.live ? Math.max(5, (row.live / maxSectorValue) * 100) : 0}%"></i><span>${row.live}</span></div>
                    <div class="trend-sector-line trend-sector-line--speculative"><i style="width:${row.speculative ? Math.max(5, (row.speculative / maxSectorValue) * 100) : 0}%"></i><span>${row.speculative}</span></div>
                  </div>
                </div>`).join("")}
            </div>
          </article>

          <article class="trend-panel trend-signal-panel">
            <header class="trend-panel-head trend-panel-head--simple">
              <div><p class="eyebrow">SPECULATIVE SIGNAL</p><h3>Which industries are showing interest?</h3><p>Only personal replies that were positive, future-facing or led to a meaningful next step are counted.</p></div>
            </header>
            <div class="trend-signal-list">
              ${signalRows.length ? signalRows.map((row) => `
                <div class="trend-signal-row">
                  <div class="trend-signal-copy">
                    <strong>${esc(row.sector)}</strong>
                    <span>${row.positive} positive from ${row.contacted} contacted · ${pct(row.positive, row.contacted)}</span>
                  </div>
                  <div class="trend-signal-meter"><i style="width:${Math.max(8, (row.positive / maxSignalCount) * 100)}%"></i></div>
                  ${row.progressed ? `<span class="trend-progressed">${row.progressed} progressed</span>` : ""}
                </div>`).join("") : '<p class="trend-empty">No positive speculative sector signal is recorded yet.</p>'}
            </div>
            <p class="trend-footnote">The response percentage is shown with its denominator because a high rate from only one or two approaches can otherwise look more significant than it is.</p>
          </article>
        </div>
      `;
    } catch (error) {
      root.innerHTML = `<div class="load-error">${esc(error.message)}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", renderTrends);
})();