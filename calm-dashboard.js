(() => {
  const CUTOVER_LAST_A_ID = 311;

  function byDateDesc(a, b, key) {
    const parse = (value) => {
      if (!value) return 0;
      const parsed = Date.parse(value.replace(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/, '$2 $1, $3'));
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    return parse(b[key]) - parse(a[key]);
  }

  function escape(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function isClosed(record) {
    return ['Application Closed', 'Role Filled / Closed', 'Closed by Andrew', 'Not Pursued', 'No Current Opportunity'].includes(record.current_status);
  }

  function cvVersion(record) {
    if (record.activity_type !== 'Open Role Application') return '';
    if (record.cv_version) return record.cv_version;
    return Number(record.id) <= CUTOVER_LAST_A_ID ? 'CV A' : 'CV B';
  }

  function reasonLabel(record) {
    const text = `${record.outcome || ''} ${record.notes || ''}`.toLowerCase();
    if (!record.outcome) return 'No reason recorded';
    if (/no individual|no specific|no more specific|other candidates|more closely match|closer to the profile|pursue other candidates/.test(text)) {
      return 'Generic / comparison response';
    }
    return 'Specific reason';
  }

  function monthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function startOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d;
  }

  function recordDate(record) {
    if (!record.date_sort) return null;
    const d = new Date(`${record.date_sort}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function countActivity(records, fromDate, type) {
    return records.filter((record) => {
      const d = recordDate(record);
      if (!d || d < fromDate) return false;
      if (type === 'applications') return record.activity_type === 'Open Role Application';
      if (type === 'speculative') return record.activity_type === 'Speculative Outreach';
      return false;
    }).length;
  }

  async function applyOverrides() {
    try {
      const response = await fetch('data/application-status-overrides.json', { cache: 'no-store' });
      if (!response.ok) return;
      const overrides = await response.json();
      state.records = state.records.map((record) => {
        const patch = overrides[record.id];
        if (!patch) return record;
        const merged = { ...record, ...patch };
        if (patch.notes_append) {
          merged.notes = [record.notes, patch.notes_append].filter(Boolean).join(' ');
          delete merged.notes_append;
        }
        merged.interview_count = Number(merged.interview_count || 0);
        return merged;
      });
      renderSummary();
      render();
    } catch (_) {
      // The base tracker remains usable if the small live overlay cannot load.
    }
  }

  function insertOverview(records) {
    if (document.querySelector('#calm-overview')) return;

    const activeApps = records.filter((r) => r.activity_type === 'Open Role Application' && r.current_status === 'Active').length;
    const liveInterviews = records.filter((r) => r.interview_count > 0 && !isClosed(r)).length;
    const awaitingSpec = records.filter((r) => r.activity_type === 'Speculative Outreach' && r.current_status === 'Awaiting Response').length;
    const currentMonth = monthKey();
    const closedThisMonth = records.filter((r) => r.activity_type === 'Open Role Application' && r.current_status === 'Application Closed' && r.outcome_date && monthKey(new Date(Date.parse(r.outcome_date.replace(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/, '$2 $1, $3')))) === currentMonth).length;

    const weekStart = startOfWeek();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const recentOutcomes = records
      .filter((r) => r.activity_type === 'Open Role Application' && r.current_status === 'Application Closed')
      .sort((a, b) => byDateDesc(a, b, 'outcome_date'))
      .slice(0, 6);

    const interviewRecords = records
      .filter((r) => r.interview_count > 0)
      .sort((a, b) => b.date_sort.localeCompare(a.date_sort))
      .slice(0, 8);

    const section = document.createElement('section');
    section.id = 'calm-overview';
    section.className = 'calm-overview';
    section.innerHTML = `
      <div class="calm-heading">
        <div><p class="eyebrow">WHERE THINGS STAND</p><h2>Current position</h2></div>
        <p>What is open, what has progressed and what has actually closed.</p>
      </div>
      <div class="calm-kpis">
        <article><span>Open applications</span><strong>${activeApps}</strong><small>Advertised roles still open</small></article>
        <article><span>Live interview conversations</span><strong>${liveInterviews}</strong><small>Not closed by either side</small></article>
        <article><span>Speculative awaiting reply</span><strong>${awaitingSpec}</strong><small>Personal outreach still open</small></article>
        <article><span>Applications closed this month</span><strong>${closedThisMonth}</strong><small>Employer rejection only</small></article>
      </div>
      <div class="calm-columns">
        <section class="calm-panel">
          <div class="calm-panel-title"><div><p class="eyebrow">RECENT OUTCOMES</p><h3>What employers actually said</h3></div></div>
          <div class="calm-list">
            ${recentOutcomes.map((r) => `
              <article class="calm-list-row">
                <div><strong>${escape(r.company)}</strong><span>${escape(r.job_title)}</span></div>
                <div class="calm-list-copy"><span class="reason-chip">${escape(reasonLabel(r))}</span><p>${escape(r.outcome || 'No outcome detail recorded.')}</p><small>${escape(r.outcome_date || '')} · ${escape(cvVersion(r))}</small></div>
              </article>`).join('') || '<p class="calm-empty">No recent advertised-role outcomes recorded.</p>'}
          </div>
        </section>
        <section class="calm-panel">
          <div class="calm-panel-title"><div><p class="eyebrow">INTERVIEWS</p><h3>Progress and outcome</h3></div></div>
          <div class="calm-list">
            ${interviewRecords.map((r) => `
              <article class="calm-list-row">
                <div><strong>${escape(r.company)}</strong><span>${escape(r.job_title)}</span></div>
                <div class="calm-list-copy"><span class="status-chip status-${escape((r.current_status || 'active').toLowerCase().replaceAll(' ', '-').replaceAll('/', '-'))}">${escape(r.current_status || 'Active')}</span><p>${escape(r.outcome || r.interview_details || 'Conversation remains open.')}</p><small>${r.interview_count} interview${r.interview_count === 1 ? '' : 's'} recorded</small></div>
              </article>`).join('') || '<p class="calm-empty">No interviews recorded.</p>'}
          </div>
        </section>
      </div>
      <section class="calm-activity">
        <div><p class="eyebrow">EFFORT</p><h3>Activity without the noise</h3></div>
        <div class="activity-pair"><span>This week</span><strong>${countActivity(records, weekStart, 'applications')}</strong><small>applications</small><strong>${countActivity(records, weekStart, 'speculative')}</strong><small>speculative</small></div>
        <div class="activity-pair"><span>This month</span><strong>${countActivity(records, monthStart, 'applications')}</strong><small>applications</small><strong>${countActivity(records, monthStart, 'speculative')}</strong><small>speculative</small></div>
        <div class="cv-test-note"><span>CV test</span><strong>CV A → CV B</strong><small>All advertised applications through House of Control are CV A. New advertised applications from now use CV B, the sales-first wording test.</small></div>
      </section>
    `;

    document.querySelector('.page-header')?.after(section);
  }

  function applyCvBadges() {
    document.querySelectorAll('#applications-body tr').forEach((row) => {
      const route = row.querySelector('.route-cell .pill');
      if (!route || !route.classList.contains('pill-role')) return;
      if (row.querySelector('.cv-version-badge')) return;
      const company = row.querySelector('.company-cell')?.textContent.trim();
      const date = row.querySelector('.date-cell')?.textContent.trim();
      const record = state.records.find((r) => r.company === company && r.activity_date === date && r.activity_type === 'Open Role Application');
      if (!record) return;
      const badge = document.createElement('span');
      badge.className = `cv-version-badge ${cvVersion(record) === 'CV B' ? 'cv-b' : 'cv-a'}`;
      badge.textContent = cvVersion(record);
      row.querySelector('.role-cell')?.append(badge);
    });
  }

  function enhanceDialog() {
    const dialog = document.querySelector('#details-dialog');
    if (!dialog || dialog.querySelector('#dialog-cv-version')) return;
    const outcomeSection = document.querySelector('#dialog-outcome')?.closest('.dialog-section');
    if (!outcomeSection) return;
    const meta = document.createElement('div');
    meta.className = 'dialog-section';
    meta.innerHTML = '<h3>Application evidence</h3><p id="dialog-cv-version"></p><p id="dialog-context" class="dialog-context"></p>';
    outcomeSection.after(meta);

    dialog.addEventListener('click', () => {});
    document.addEventListener('click', (event) => {
      const button = event.target.closest?.('[data-details-id]');
      if (!button) return;
      const record = state.records.find((r) => r.id === button.dataset.detailsId);
      if (!record) return;
      queueMicrotask(() => {
        const cv = document.querySelector('#dialog-cv-version');
        const context = document.querySelector('#dialog-context');
        if (cv) cv.textContent = cvVersion(record) ? `${cvVersion(record)} · ${cvVersion(record) === 'CV A' ? 'original MASTER wording order' : 'sales-first MASTER wording order'}` : 'No advertised-role CV version applies.';
        if (context) context.textContent = record.notes || 'No additional context recorded.';
      });
    }, true);
  }

  async function boot() {
    let attempts = 0;
    while ((typeof state === 'undefined' || !state.records?.length) && attempts < 100) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      attempts += 1;
    }
    if (typeof state === 'undefined' || !state.records?.length) return;

    await applyOverrides();
    insertOverview(state.records);
    enhanceDialog();
    applyCvBadges();

    const body = document.querySelector('#applications-body');
    if (body) new MutationObserver(applyCvBadges).observe(body, { childList: true, subtree: true });
  }

  boot();
})();
