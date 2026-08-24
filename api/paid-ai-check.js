import fs from 'node:fs';
import path from 'node:path';
import { generateText } from 'ai';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  try {
    const csv = fs.readFileSync(path.join(process.cwd(), 'data', 'applications.csv'), 'utf8');
    const { text, usage } = await generateText({
      model: 'openai/gpt-5.6-luna',
      system: `You are checking Andrew Langmaid's job-search tracker. Use only the supplied CSV. The question means completed meetings, calls or interviews Andrew actually had earlier in 2026, not invitations to future meetings. Be comprehensive. Return concise JSON with an answer and an events array containing company, date and event.`,
      prompt: `QUESTION: meeting earlier in the year?\n\nTRACKER CSV:\n${csv}`,
    });
    return res.status(200).json({ ok: true, model: 'GPT-5.6 Luna', text, usage });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
}
