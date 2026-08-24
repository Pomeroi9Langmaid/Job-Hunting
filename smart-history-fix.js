(() => {
  const form = document.querySelector('#smart-search-form');
  const input = document.querySelector('#smart-search-input');
  const status = document.querySelector('#smart-search-status');
  const answer = document.querySelector('#smart-search-answer');
  const answerText = document.querySelector('#smart-answer-text');
  const matchesRoot = document.querySelector('#smart-search-matches');
  if (!form || !input || !status || !answer || !answerText || !matchesRoot) return;

  let recordsPromise;

  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i], n = text[i + 1];
      if (c === '"' && quoted && n === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = !quoted;
      else if (c === ',' && !quoted) { row.push(field); field = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && n === '\n') i += 1;
        row.push(field);
        if (row.some((value) => value.length > 0)) rows.push(row);
        row = []; field = '';
      } else field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    const [headers, ...data] = rows;
    return data.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  }

  function esc(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function historicalMeetingQuery(query) {
    const q = query.toLowerCase();
    const meetingWord = /(meeting|meetings|met|interview|interviews|call|calls)/i.test(q);
    const historicalWord = /(earlier|previous|past|before|this year|in the year|earlier in the year|earlier this year)/i.test(q);
    return meetingWord && historicalWord;
  }

  function eventDate(value) {
    const date = new Date(`${value} 12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function completedEvent(label) {
    const upper = String(label || '').toUpperCase();
    if (!/(INTERVIEW|CALL|MEETING|COFFEE|LUNCH)/.test(upper)) return false;
    if (/(INVITED|SCHEDULED|PROPOSED|OFFERED|DID NOT PROCEED|AWAITING|FOLLOW-UP|MATERIAL RECEIVED)/.test(upper)) return false;
    return true;
  }

  function contactFromEvent(record, label) {
    if (record.contact_name) return record.contact_name;
    const withMatch = String(label || '').match(/WITH\s+(.+)$/i);
    if (!withMatch) return '';
    return withMatch[1]
      .toLowerCase()
      .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
  }

  function evidenceFor(record, label) {
    const details = String(record.interview_details || '').trim();
    if (details) return details;
    return `${label}. ${record.job_title || ''}`.trim();
  }

  async function loadRecords() {
    if (!recordsPromise) {
      recordsPromise = fetch('data/applications.csv', { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error(`Could not load tracker (${response.status})`);
          return response.text();
        })
        .then(parseCsv);
    }
    return recordsPromise;
  }

  function render(events) {
    answer.hidden = false;
    const companies = new Set(events.map((event) => event.record.company));
    answerText.textContent = events.length
      ? `I found ${events.length} completed meeting/interview event${events.length === 1 ? '' : 's'} earlier in 2026 across ${companies.size} compan${companies.size === 1 ? 'y' : 'ies'}. These come from the recorded interview/call history, not from recent invitation emails.`
      : 'I could not find any completed meeting or interview events earlier in 2026 in the current tracker.';

    matchesRoot.innerHTML = events.map(({ record, date, label }) => `
      <article class="smart-match-card">
        <div class="smart-match-topline">
          <div>
            <h4>${esc(record.company)}</h4>
            <p>${esc([contactFromEvent(record, label), date].filter(Boolean).join(' · '))}</p>
          </div>
          <span class="smart-confidence smart-confidence--high">HIGH</span>
        </div>
        <p class="smart-match-reason">Completed ${esc(label.toLowerCase())}</p>
        <blockquote>${esc(evidenceFor(record, label))}</blockquote>
        <button type="button" class="smart-show-record" data-history-company="${esc(record.company)}">Show in tracker</button>
      </article>
    `).join('');

    matchesRoot.querySelectorAll('[data-history-company]').forEach((button) => {
      button.addEventListener('click', () => {
        const quickSearch = document.querySelector('#search-input');
        if (quickSearch) {
          quickSearch.value = button.dataset.historyCompany;
          quickSearch.dispatchEvent(new Event('input', { bubbles: true }));
        }
        document.querySelector('.results-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    status.textContent = 'Historical tracker events searched directly · GPT is not required for this factual lookup.';
  }

  async function runHistoricalSearch() {
    status.textContent = 'Checking all recorded meetings, calls and interviews earlier in 2026…';
    answer.hidden = true;
    try {
      const records = await loadRecords();
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const events = [];

      records.forEach((record) => {
        String(record.interview_steps || '')
          .split(';')
          .map((step) => step.trim())
          .filter(Boolean)
          .forEach((step) => {
            const divider = step.indexOf('|');
            if (divider < 0) return;
            const date = step.slice(0, divider).trim();
            const label = step.slice(divider + 1).trim();
            const parsed = eventDate(date);
            if (!parsed || parsed.getFullYear() !== now.getFullYear() || parsed >= cutoff) return;
            if (!completedEvent(label)) return;
            events.push({ record, date, label, parsed });
          });
      });

      events.sort((a, b) => a.parsed - b.parsed);
      render(events);
    } catch (error) {
      console.error(error);
      status.textContent = 'Historical meeting search could not be loaded.';
    }
  }

  form.addEventListener('submit', (event) => {
    const query = input.value.trim();
    if (!historicalMeetingQuery(query)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runHistoricalSearch();
  }, true);
})();
