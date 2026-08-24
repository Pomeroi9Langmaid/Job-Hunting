(() => {
  const countEl = document.querySelector('#stat-targets');
  if (!countEl) return;

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

  function companyKey(value) {
    const basic = String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    // Textalk Group is the same Textalk AB group already approached through Abicart.
    if (basic === 'textalkgroup') return 'textalk';
    return basic;
  }

  async function refreshTargetStat() {
    try {
      const [appsRes, updatesRes, targetsRes, enrichmentRes, companiesRes] = await Promise.all([
        fetch('data/applications.csv', { cache: 'no-store' }),
        fetch('data/application-updates.csv', { cache: 'no-store' }),
        fetch('data/vetted-speculative-targets.csv', { cache: 'no-store' }),
        fetch('data/contact-enrichment.csv', { cache: 'no-store' }),
        fetch('data/companies.csv', { cache: 'no-store' }),
      ]);

      if (![appsRes, updatesRes, targetsRes, enrichmentRes, companiesRes].every((r) => r.ok)) return;

      const applications = parseCsv(await appsRes.text());
      const updates = parseCsv(await updatesRes.text());
      const targets = parseCsv(await targetsRes.text());
      const enrichment = parseCsv(await enrichmentRes.text());
      const companies = parseCsv(await companiesRes.text());

      const recordsById = new Map(applications.map((record) => [String(record.id), record]));
      updates.forEach((record) => recordsById.set(String(record.id), record));
      const records = [...recordsById.values()];

      const recordsByCompany = new Map();
      records.forEach((record) => {
        const key = companyKey(record.company);
        const existing = recordsByCompany.get(key) || [];
        existing.push(record);
        recordsByCompany.set(key, existing);
      });

      const enrichmentByCompany = new Map(
        enrichment.map((row) => [companyKey(row.company), row]),
      );
      const companiesByCompany = new Map(
        companies.map((row) => [companyKey(row.company), row]),
      );

      const currentUnsent = targets.filter((target) => {
        if (!String(target.outreach_status || '').toLowerCase().includes('ready')) return false;
        const prior = recordsByCompany.get(companyKey(target.company)) || [];
        if (!prior.length) return true;
        return prior.every((record) =>
          record.activity_type === 'Prospective Target' && record.current_status === 'Not Contacted',
        );
      });

      const hasVerifiedDirectEmail = (target) => {
        if (String(target.contact_email || '').trim()) return true;
        const key = companyKey(target.company);
        const enriched = enrichmentByCompany.get(key);
        if (
          enriched &&
          String(enriched.action || '').toLowerCase() === 'apply' &&
          String(enriched.professional_email || '').trim()
        ) return true;
        const company = companiesByCompany.get(key);
        return Boolean(company && String(company.contact_email || '').trim());
      };

      const directEmailCount = currentUnsent.filter(hasVerifiedDirectEmail).length;
      const card = countEl.closest('.smart-stat');
      const label = card?.querySelector('span');
      const note = card?.querySelector('small');

      if (label) label.textContent = 'Unsent vetted targets';
      countEl.textContent = String(currentUnsent.length);
      if (note) note.textContent = `${directEmailCount} with verified direct email · re-check before send`;
      if (card) card.title = currentUnsent.map((target) => target.company).join(', ');
    } catch (error) {
      console.warn('Could not calculate current vetted target queue', error);
    }
  }

  refreshTargetStat();
})();
