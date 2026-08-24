import { generateText } from 'ai';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  try {
    const { text, usage } = await generateText({
      model: 'openai/gpt-5.6-luna',
      prompt: 'Return exactly this text and nothing else: AI_GATEWAY_OK',
    });
    return res.status(200).json({ ok: text.trim() === 'AI_GATEWAY_OK', text: text.trim(), usage });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message || error) });
  }
}
