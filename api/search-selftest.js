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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const host = req.headers.host;
  const base = `https://${host}`;
  try {
    const [baseRes, updatesRes] = await Promise.all([
      fetch(`${base}/data/applications.csv`, { cache: 'no-store' }),
      fetch(`${base}/data/application-updates.csv`, { cache: 'no-store' }),
    ]);
    if (!baseRes.ok || !updatesRes.ok) throw new Error('Could not load tracker data');
    const recordsById = new Map(parseCsv(await baseRes.text()).map((r) => [String(r.id), r]));
    parseCsv(await updatesRes.text()).forEach((r) => recordsById.set(String(r.id), r));
    const context = { records: [...recordsById.values()], replies: [], reply_messages: [] };
    const response = await fetch(`${base}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ query: 'how many jobs applied for this week?', context }),
    });
    const text = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (error) {
    res.status(500).json({ error: String(error?.message || error) });
  }
}
