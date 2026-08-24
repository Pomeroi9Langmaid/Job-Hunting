(() => {
  const root = document.querySelector('#smart-search');
  if (!root) return;

  const els = {
    form: document.querySelector('#smart-search-form'),
    input: document.querySelector('#smart-search-input'),
    submit: document.querySelector('#smart-search-submit'),
    status: document.querySelector('#smart-search-status'),
    answer: document.querySelector('#smart-search-answer'),
    answerText: document.querySelector('#smart-answer-text'),
    matches: document.querySelector('#smart-search-matches'),
    examples: document.querySelectorAll('[data-smart-query]'),
    activeInterviews: document.querySelector('#stat-active-interviews'),
    replyRate: document.querySelector('#stat-reply-rate'),
    positiveReplies: document.querySelector('#stat-positive-replies'),
    progressed: document.querySelector('#stat-progressed'),
    cvRetained: document.querySelector('#stat-cv-retained'),
    targets: document.querySelector('#stat-targets'),
  };

  const smartState = { records: [], replies: [], messages: [], companies: [], ready: false };

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      const n = text[i + 1];
      if (c === '"' && quoted && n === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = !quoted;
      else if (c === ',' && !quoted) { row.push(field); field = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && n === '\n') i += 1;
        row.push(field);
        if (row.some((value) => value.length > 0)) rows.push(row);
        row = [];
        field = '';
      } else field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    const [headers, ...dataRows] = rows;
    return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  }

  function esc(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function yes(value) { return String(value).toLowerCase() === 'yes'; }

  function compactRecord(record) {
    return {
      id: record.id,
      company: record.company,
      activity_date: record.activity_date,
      date_sort: record.date_sort,
      activity_type: record.activity_type,
      job_title: record.job_title,
      city: record.city,
      contact_name: record.contact_name,
      contact_title: record.contact_title,
      contact_email: record.contact_email,
      current_status: record.current_status,
      route_reason: record.route_reason,
      notes: record.notes,
      interview_count: record.interview_count,
      interview_steps: record.interview_steps,
      interview_details: record.interview_details,
      outcome_date: record.outcome_date,
      outcome: record.outcome,
      sector_group: record.sector_group,
      industry_sector: record.industry_sector,
      employee_band: record.employee_band,
    };
  }

  function buildContext() {
    return {
      records: smartState.records.map(compactRecord),
      replies: smartState.replies,
      reply_messages: smartState.messages,
    };
  }

  function renderStats() {
    const speculative = smartState.records.filter((r) => r.activity_type === 'Speculative Outreach');
    const personalReplies = smartState.replies.filter(
      (r) => r.route === 'Speculative Outreach' && r.response_type === 'Personal reply' && !yes(r.automated),
    );
    const activeInterviews = smartState.records.filter(
      (r) => Number(r.interview_count || 0) > 0 && ['Active', 'Awaiting Response'].includes(r.current_status),
    );
    const positive = personalReplies.filter((r) => yes(r.positive_future_facing));
    const progressed = personalReplies.filter((r) => yes(r.conversation_progressed));
    const cvRetained = personalReplies.filter((r) =>
      ['CV retained', 'Future consideration', 'Future role lead', 'Keep in touch'].includes(r.classification),
    );

    if (els.activeInterviews) els.activeInterviews.textContent = activeInterviews.length;
    if (els.replyRate) els.replyRate.textContent = speculative.length ? `${Math.round((personalReplies.length / speculative.length) * 100)}%` : '—';
    if (els.positiveReplies) els.positiveReplies.textContent = positive.length;
    if (els.progressed) els.progressed.textContent = progressed.length;
    if (els.cvRetained) els.cvRetained.textContent = cvRetained.length;
  }

  function renderMatches(matches) {
    if (!matches.length) {
      els.matches.innerHTML = '<div class="smart-no-matches">No specific matching records were returned.</div>';
      return;
    }

    els.matches.innerHTML = matches.map((match) => `
      <article class="smart-match-card">
        <div class="smart-match-topline">
          <div>
            <h4>${esc(match.company || 'Unknown company')}</h4>
            <p>${esc([match.contact, match.date].filter(Boolean).join(' · '))}</p>
          </div>
          <span class="smart-confidence smart-confidence--${esc(match.confidence || 'medium')}">${esc((match.confidence || 'medium').toUpperCase())}</span>
        </div>
        <p class="smart-match-reason">${esc(match.reason || '')}</p>
        ${match.evidence ? `<blockquote>${esc(match.evidence)}</blockquote>` : ''}
        <button type="button" class="smart-show-record" data-show-company="${esc(match.company || '')}">Show in tracker</button>
      </article>
    `).join('');

    els.matches.querySelectorAll('[data-show-company]').forEach((button) => {
      button.addEventListener('click', () => {
        const quickSearch = document.querySelector('#search-input');
        if (quickSearch) {
          quickSearch.value = button.dataset.showCompany || '';
          quickSearch.dispatchEvent(new Event('input', { bubbles: true }));
        }
        document.querySelector('.results-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function showResult(result) {
    els.answer.hidden = false;
    els.answerText.textContent = result.answer || 'No answer returned.';
    renderMatches(Array.isArray(result.matches) ? result.matches : []);
    els.status.textContent = `Answered with ${result.model || 'GPT-5.6 Luna'} · ${smartState.records.length} current tracker records indexed.`;
  }

  function showFailure(message) {
    els.answer.hidden = false;
    els.answerText.textContent = message;
    els.matches.innerHTML = '';
    els.status.textContent = 'GPT search failed · no low-quality fallback answer was substituted.';
  }

  async function runSearch(query) {
    if (!smartState.ready) {
      els.status.textContent = 'Job-search memory is still loading…';
      return;
    }

    els.submit.disabled = true;
    els.submit.textContent = 'Searching…';
    els.status.textContent = 'GPT-5.6 Luna is interpreting the question and checking the tracker…';
    els.answer.hidden = true;

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context: buildContext() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Search returned ${response.status}`);
      showResult(result);
    } catch (error) {
      console.error('GPT tracker search failed.', error);
      showFailure(error.message || 'GPT search is temporarily unavailable.');
    } finally {
      els.submit.disabled = false;
      els.submit.textContent = 'Ask';
    }
  }

  async function initialiseSmartSearch() {
    try {
      const [applicationsResponse, updatesResponse, repliesResponse, messagesResponse, companiesResponse] = await Promise.all([
        fetch('data/applications.csv', { cache: 'no-store' }),
        fetch('data/application-updates.csv', { cache: 'no-store' }),
        fetch('data/replies.csv', { cache: 'no-store' }),
        fetch('data/reply-messages.json', { cache: 'no-store' }),
        fetch('data/companies.csv', { cache: 'no-store' }),
      ]);
      if (![applicationsResponse, updatesResponse, repliesResponse, messagesResponse, companiesResponse].every((r) => r.ok)) {
        throw new Error('One or more search data sources could not be loaded.');
      }

      const companies = parseCsv(await companiesResponse.text());
      const companyMap = new Map(companies.map((company) => [company.company, company]));
      const recordsById = new Map(parseCsv(await applicationsResponse.text()).map((record) => [String(record.id), record]));
      parseCsv(await updatesResponse.text()).forEach((record) => recordsById.set(String(record.id), record));

      if (typeof roleAdditions !== 'undefined') {
        roleAdditions.forEach((record) => {
          if (!recordsById.has(String(record.id))) recordsById.set(String(record.id), record);
        });
      }

      smartState.records = [...recordsById.values()].map((record) => {
        const override = typeof roleOverrides !== 'undefined' ? roleOverrides[record.id] : null;
        const merged = override ? { ...record, ...override } : record;
        const company = companyMap.get(merged.company) || {};
        return {
          ...merged,
          sector_group: merged.sector_group || company.sector_group || '',
          industry_sector: merged.industry_sector || company.industry_sector || '',
          employee_band: merged.employee_band || company.employee_band || '',
        };
      }).sort((a, b) => String(b.date_sort || '').localeCompare(String(a.date_sort || '')) || Number(b.id || 0) - Number(a.id || 0));

      smartState.replies = parseCsv(await repliesResponse.text());
      smartState.messages = await messagesResponse.json();
      smartState.companies = companies;
      smartState.ready = true;
      renderStats();
      els.status.textContent = `GPT ready · ${smartState.records.length} current tracker records + ${smartState.messages.length} original replies indexed.`;
    } catch (error) {
      console.error(error);
      els.status.textContent = 'Smart search data could not be loaded.';
    }
  }

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = els.input.value.trim();
    if (query) runSearch(query);
  });

  els.examples.forEach((button) => {
    button.addEventListener('click', () => {
      els.input.value = button.dataset.smartQuery || button.textContent.trim();
      els.form.requestSubmit();
    });
  });

  initialiseSmartSearch();
})();
