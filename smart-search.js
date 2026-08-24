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

  const smartState = {
    records: [],
    replies: [],
    messages: [],
    companies: [],
    ready: false,
  };

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      const n = text[i + 1];
      if (c === '"' && quoted && n === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        quoted = !quoted;
      } else if (c === ',' && !quoted) {
        row.push(field);
        field = '';
      } else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && n === '\n') i += 1;
        row.push(field);
        if (row.some((value) => value.length > 0)) rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }

    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }

    const [headers, ...dataRows] = rows;
    return dataRows.map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
    );
  }

  function esc(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

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
    };
  }

  function buildContext() {
    const companyMap = new Map(smartState.companies.map((company) => [company.company, company]));
    return {
      records: smartState.records.map((record) => {
        const company = companyMap.get(record.company) || {};
        return {
          ...compactRecord(record),
          sector_group: company.sector_group || '',
          industry_sector: company.industry_sector || '',
          employee_band: company.employee_band || '',
        };
      }),
      replies: smartState.replies,
      reply_messages: smartState.messages,
    };
  }

  function yes(value) {
    return String(value).toLowerCase() === 'yes';
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
    const targets = smartState.records.filter((r) => r.activity_type === 'Prospective Target');

    els.activeInterviews.textContent = activeInterviews.length;
    els.replyRate.textContent = speculative.length
      ? `${Math.round((personalReplies.length / speculative.length) * 100)}%`
      : '—';
    els.positiveReplies.textContent = positive.length;
    els.progressed.textContent = progressed.length;
    els.cvRetained.textContent = cvRetained.length;
    els.targets.textContent = targets.length;
  }

  function messageFor(company, date = '') {
    return smartState.messages.find((m) =>
      m.company === company && (!date || m.response_date === date),
    ) || smartState.messages.find((m) => m.company === company) || null;
  }

  function recordFor(company) {
    return smartState.records.find((r) => r.company === company) || null;
  }

  function cleanEvidence(value, max = 240) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
  }

  function matchFromReply(reply, reason, confidence = 'high', evidenceOverride = '') {
    const message = messageFor(reply.company, reply.response_date);
    const record = recordFor(reply.company);
    return {
      company: reply.company,
      contact: message?.sender || record?.contact_name || '',
      date: reply.response_date || record?.activity_date || '',
      reason,
      evidence: cleanEvidence(evidenceOverride || message?.message || reply.notes),
      record_id: record?.id || '',
      confidence,
    };
  }

  function addDays(iso, days) {
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() + days);
    return date;
  }

  function isoDate(date) {
    if (!date) return '';
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function friendlyDate(iso) {
    if (!iso) return '';
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
  }

  function todayLocal() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  }

  function timingNote(reply) {
    const text = `${reply.notes || ''} ${messageFor(reply.company, reply.response_date)?.message || ''}`;
    const range = text.match(/(\d+)\s*[–-]\s*(\d+)\s*weeks?/i);
    const single = text.match(/(?:in|after)\s+(\d+)\s+weeks?/i);
    if (!reply.response_date || (!range && !single)) return '';

    const minWeeks = Number(range?.[1] || single?.[1] || 0);
    const maxWeeks = Number(range?.[2] || single?.[1] || minWeeks);
    const start = addDays(reply.response_date, minWeeks * 7);
    const end = addDays(reply.response_date, maxWeeks * 7);
    if (!start || !end) return '';

    const today = todayLocal();
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12);
    const dayMs = 86400000;

    if (today < startDay) {
      const days = Math.ceil((startDay - today) / dayMs);
      return `Suggested window: ${friendlyDate(isoDate(start))}–${friendlyDate(isoDate(end))}; starts in ${days} day${days === 1 ? '' : 's'}.`;
    }
    if (today <= endDay) {
      return `Suggested window: ${friendlyDate(isoDate(start))}–${friendlyDate(isoDate(end))}; that window is now open.`;
    }
    const overdue = Math.floor((today - endDay) / dayMs);
    return `Suggested window was ${friendlyDate(isoDate(start))}–${friendlyDate(isoDate(end))}; it ended ${overdue} day${overdue === 1 ? '' : 's'} ago.`;
  }

  function intentSearch(query) {
    const q = query.toLowerCase();
    const personal = smartState.replies.filter((r) => r.response_type === 'Personal reply' && !yes(r.automated));

    const asksMeeting = /(coffee|lunch|meet|meeting|catch.?up|come by|informal|conversation)/i.test(q);
    if (asksMeeting) {
      const invitationPattern = /(coffee|lunch|come by|set a time|meet|meeting|conversation|exploratory)/i;
      const rows = personal.filter((reply) => {
        const text = `${reply.notes || ''} ${messageFor(reply.company, reply.response_date)?.message || ''}`;
        return invitationPattern.test(text) && (yes(reply.conversation_progressed) || /(invited|proposed|could you|would like|happy to|set a time|come by)/i.test(text));
      });
      const matches = rows.map((reply) => matchFromReply(reply, 'An actual invitation or progressed conversation is recorded.', 'high')).slice(0, 12);
      if (matches.length) {
        return {
          answer: `I found ${matches.length} company${matches.length === 1 ? '' : 'ies'} where the stored correspondence supports an invitation to meet, have lunch/coffee, or move into an exploratory conversation.`,
          matches,
          fallback: true,
        };
      }
    }

    const asksNewPerson = /(new person|new colleague|just started|settle in|wait.*weeks|few weeks|2.?3 weeks)/i.test(q);
    if (asksNewPerson) {
      const rows = personal.filter((reply) => {
        const text = `${reply.notes || ''} ${messageFor(reply.company, reply.response_date)?.message || ''}`;
        return /(new colleague|new person|settle|2\s*[–-]\s*3\s*weeks|few weeks|weeks)/i.test(text);
      });
      const matches = rows.map((reply) => {
        const timing = timingNote(reply);
        return matchFromReply(
          reply,
          `${reply.classification || 'Follow-up lead'}${timing ? ` · ${timing}` : ''}`,
          'high',
        );
      });
      if (matches.length) {
        const first = matches[0];
        const firstReply = rows[0];
        const timing = timingNote(firstReply);
        return {
          answer: `${first.company} is the clearest match. ${first.contact ? `${first.contact} ` : 'The sender '}told you to wait and approach the new colleague after they had time to settle in.${timing ? ` ${timing}` : ''}`,
          matches,
          fallback: true,
        };
      }
    }

    const asksFollowup = /(follow.?up|follow up|contact.*now|reach out.*now|should i contact|due now|due soon|reconnect)/i.test(q);
    if (asksFollowup) {
      const rows = personal.filter((reply) => {
        const text = `${reply.notes || ''} ${messageFor(reply.company, reply.response_date)?.message || ''}`;
        return yes(reply.conversation_progressed) || /(follow.?up|revert|hear back|weeks|vacation|settle|contact.*future|reach out)/i.test(text);
      });
      const ranked = rows.map((reply) => {
        const note = timingNote(reply);
        const timingScore = /now open|ended/.test(note) ? 4 : /starts in/.test(note) ? 2 : 0;
        return { reply, note, score: timingScore + (yes(reply.conversation_progressed) ? 2 : 0) + (yes(reply.positive_future_facing) ? 1 : 0) };
      }).sort((a, b) => b.score - a.score || String(b.reply.response_date).localeCompare(String(a.reply.response_date)));
      const matches = ranked.slice(0, 10).map(({ reply, note }) =>
        matchFromReply(reply, `${reply.classification || 'Follow-up candidate'}${note ? ` · ${note}` : ''}`, note ? 'high' : 'medium'),
      );
      if (matches.length) {
        return {
          answer: 'These are the strongest follow-up candidates I can support from the stored replies and timing notes. Where a sender gave a specific time window, I have calculated it from the recorded response date rather than guessing.',
          matches,
          fallback: true,
        };
      }
    }

    const asksCv = /(keep.*cv|kept.*cv|retain.*cv|retained.*cv|cv.*file|future consideration|keep.*details|keep.*contact)/i.test(q);
    if (asksCv) {
      const accepted = new Set(['CV retained', 'Future consideration', 'Future role lead', 'Keep in touch']);
      const rows = personal.filter((reply) => accepted.has(reply.classification));
      const matches = rows.map((reply) => matchFromReply(reply, reply.classification || 'Future consideration', 'high')).slice(0, 20);
      return {
        answer: `I found ${matches.length} personal response${matches.length === 1 ? '' : 's'} explicitly classified as CV retained, future consideration, future role lead or keep-in-touch.`,
        matches,
        fallback: true,
      };
    }

    const asksWarm = /(warm|warmest|positive|liked|praise|praised|superb|excellent|impressive|interesting background|strong track|good.*email|cv.*interesting)/i.test(q);
    if (asksWarm) {
      const praisePattern = /(impressive|very interesting|great deal of experience|highly relevant|strong track record|solid commercial background|good ones|interesting background|excellent|eager to make things happen)/i;
      const scored = personal.map((reply) => {
        const message = messageFor(reply.company, reply.response_date)?.message || '';
        let score = 0;
        if (yes(reply.positive_future_facing)) score += 3;
        if (yes(reply.conversation_progressed)) score += 4;
        if (praisePattern.test(message)) score += 5;
        if (['CV retained', 'Future consideration', 'Future role lead', 'Keep in touch'].includes(reply.classification)) score += 2;
        return { reply, score };
      }).filter((item) => item.score >= 5)
        .sort((a, b) => b.score - a.score || String(b.reply.response_date).localeCompare(String(a.reply.response_date)));
      const matches = scored.slice(0, 12).map(({ reply, score }) =>
        matchFromReply(reply, score >= 10 ? 'Exceptionally warm / progressed response' : 'Positive future-facing response', score >= 8 ? 'high' : 'medium'),
      );
      if (matches.length) {
        return {
          answer: `These are the strongest warm signals in the stored correspondence. I ranked direct praise and conversations that actually progressed above generic “we'll keep you in mind” replies.`,
          matches,
          fallback: true,
        };
      }
    }

    return null;
  }

  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'with', 'who', 'which', 'what', 'where', 'when', 'from', 'they', 'their',
    'there', 'have', 'had', 'has', 'was', 'were', 'this', 'about', 'into', 'would', 'could', 'should', 'said',
    'me', 'my', 'all', 'any', 'now', 'some', 'something', 'company', 'companies', 'person', 'people', 'email',
  ]);

  const conceptGroups = [
    ['coffee', 'lunch', 'meet', 'meeting', 'conversation', 'catch up', 'come by', 'exploratory', 'invited'],
    ['positive', 'superb', 'excellent', 'impressive', 'interesting', 'relevant', 'strong track record', 'great deal of experience', 'solid commercial background', 'good ones'],
    ['cv', 'retain', 'retained', 'on file', 'keep in mind', 'future consideration', 'future opportunity', 'if something comes up'],
    ['follow up', 'follow-up', 'later', 'weeks', 'new colleague', 'new person', 'settle in', 'revert', 'hear back', 'vacation'],
    ['future', 'near future', 'future-facing', 'opportunity', 'opportunities', 'something suitable', 'if that changes'],
  ];

  function queryTerms(query) {
    const lower = query.toLowerCase();
    const terms = lower.match(/[\p{L}\p{N}]+/gu) || [];
    const useful = terms.filter((term) => term.length > 2 && !stopWords.has(term));
    const expanded = new Set(useful);
    conceptGroups.forEach((group) => {
      if (group.some((phrase) => lower.includes(phrase) || useful.includes(phrase))) {
        group.forEach((phrase) => expanded.add(phrase));
      }
    });
    return [...expanded];
  }

  function fallbackDocs() {
    const docs = [];
    smartState.messages.forEach((m) => docs.push({
      company: m.company,
      contact: m.sender || '',
      date: m.response_date || '',
      text: m.message || '',
      source: 'Original reply',
    }));
    smartState.replies.forEach((r) => docs.push({
      company: r.company,
      contact: messageFor(r.company, r.response_date)?.sender || '',
      date: r.response_date || '',
      text: [r.classification, r.notes].filter(Boolean).join('. '),
      source: 'Tracker reply summary',
      record_id: recordFor(r.company)?.id || '',
    }));
    smartState.records.forEach((r) => docs.push({
      company: r.company,
      contact: r.contact_name || '',
      date: r.activity_date || '',
      text: [r.job_title, r.notes, r.interview_details, r.outcome, r.route_reason].filter(Boolean).join('. '),
      source: 'Tracker record',
      record_id: r.id || '',
    }));
    return docs;
  }

  function genericLocalSearch(query) {
    const terms = queryTerms(query);
    const lowerQuery = query.toLowerCase();
    const scored = fallbackDocs().map((doc) => {
      const haystack = `${doc.company} ${doc.contact} ${doc.text}`.toLowerCase();
      let score = 0;
      terms.forEach((term) => {
        if (haystack.includes(term)) score += term.includes(' ') ? 5 : 2;
      });
      if (haystack.includes(lowerQuery)) score += 12;
      return { ...doc, score };
    }).filter((doc) => doc.score > 0)
      .sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)));

    const seen = new Set();
    const matches = [];
    for (const doc of scored) {
      const key = doc.company;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        company: doc.company,
        contact: doc.contact,
        date: doc.date,
        reason: doc.source,
        evidence: cleanEvidence(doc.text),
        record_id: doc.record_id || '',
        confidence: doc.score >= 10 ? 'high' : doc.score >= 5 ? 'medium' : 'low',
      });
      if (matches.length >= 10) break;
    }

    return {
      answer: matches.length
        ? `I found ${matches.length} likely match${matches.length === 1 ? '' : 'es'} across the tracker and reply archive. These are ranked by the meaning and wording of what you remembered.`
        : 'I could not find a strong match in the stored tracker and reply archive for that wording.',
      matches,
      fallback: true,
    };
  }

  function localSmartSearch(query) {
    return intentSearch(query) || genericLocalSearch(query);
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
        const company = button.dataset.showCompany;
        const quickSearch = document.querySelector('#search-input');
        if (quickSearch) {
          quickSearch.value = company;
          quickSearch.dispatchEvent(new Event('input', { bubbles: true }));
        }
        document.querySelector('.results-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function showResult(result, modelLabel = '') {
    els.answer.hidden = false;
    els.answerText.textContent = result.answer || 'No answer returned.';
    renderMatches(Array.isArray(result.matches) ? result.matches : []);
    els.status.textContent = result.fallback
      ? 'Smart tracker reasoning used · GPT connection was unavailable for this search.'
      : `Searched tracker + reply archive${modelLabel ? ` with ${modelLabel}` : ''}.`;
  }

  async function runSearch(query) {
    if (!smartState.ready) {
      els.status.textContent = 'Job-search memory is still loading…';
      return;
    }

    els.submit.disabled = true;
    els.submit.textContent = 'Searching…';
    els.status.textContent = 'Reading the tracker, reply summaries and original replies…';
    els.answer.hidden = true;

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context: buildContext() }),
      });

      if (!response.ok) throw new Error(`AI search returned ${response.status}`);
      const result = await response.json();
      showResult(result, result.model || 'GPT');
    } catch (error) {
      console.warn('GPT search unavailable; using tracker reasoning.', error);
      showResult(localSmartSearch(query));
    } finally {
      els.submit.disabled = false;
      els.submit.textContent = 'Ask';
    }
  }

  async function initialiseSmartSearch() {
    try {
      const [applicationsResponse, repliesResponse, messagesResponse, companiesResponse] = await Promise.all([
        fetch('data/applications.csv', { cache: 'no-store' }),
        fetch('data/replies.csv', { cache: 'no-store' }),
        fetch('data/reply-messages.json', { cache: 'no-store' }),
        fetch('data/companies.csv', { cache: 'no-store' }),
      ]);

      if (![applicationsResponse, repliesResponse, messagesResponse, companiesResponse].every((r) => r.ok)) {
        throw new Error('One or more search data sources could not be loaded.');
      }

      const baseRecords = parseCsv(await applicationsResponse.text());
      const existingIds = new Set(baseRecords.map((r) => String(r.id)));
      const additions = typeof roleAdditions !== 'undefined'
        ? roleAdditions.filter((r) => !existingIds.has(String(r.id)))
        : [];
      smartState.records = [...baseRecords, ...additions].map((record) =>
        (typeof roleOverrides !== 'undefined' && roleOverrides[record.id])
          ? { ...record, ...roleOverrides[record.id] }
          : record,
      );
      smartState.replies = parseCsv(await repliesResponse.text());
      smartState.messages = await messagesResponse.json();
      smartState.companies = parseCsv(await companiesResponse.text());
      smartState.ready = true;
      renderStats();
      els.status.textContent = `Ready · searching ${smartState.records.length} tracker records and ${smartState.messages.length} original replies.`;
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
