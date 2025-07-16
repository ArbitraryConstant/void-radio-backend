// server.js – complete, crash-free
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());

/* ---------- Keys ---------- */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GOOGLE_API_KEY    = process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY    = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY  = process.env.DEEPSEEK_API_KEY;

/* ---------- Mode Templates ---------- */
const MODE_TEMPLATES = {
  standard: {
    round1:  "The core seed thought for this collaborative exploration is: \"{seed}\". Please offer your unique perspective...",
    roundN:  "This is Round {round}... Your AI colleagues shared:\n{previousSummary}\n...",
    synthesis: "Synthesize the emergent insights from this multi-AI collaboration..."
  },
  deep: {
    round1:  "For deep philosophical exploration: \"{seed}\"...",
    roundN:  "Continuing our deep philosophical dive into \"{seed}\" - Round {round}...",
    synthesis: "Synthesize this deep collaborative exploration..."
  },
  quick: {
    round1:  "Quick collaborative burst on: \"{seed}\"...",
    roundN:  "Quick Round {round} building on: \"{seed}\"...",
    synthesis: "Rapid synthesis..."
  },
  meta: {
    round1:  "Meta-recursive exploration of: \"{seed}\"...",
    roundN:  "Meta Round {round} on \"{seed}\"...",
    synthesis: "Meta-synthesis..."
  }
};

/* ---------- AI Callers ---------- */
const callClaude   = async (prompt, prev = []) => {
  const msgs = [...prev.map(r => ({ role: r.role, content: r.content })), { role: 'user', content: prompt }];
  const { data } = await axios.post('https://api.anthropic.com/v1/messages',
    { model: 'claude-3-5-sonnet-20241022', max_tokens: 1200, messages: msgs },
    { headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } });
  return data.content[0].text;
};

const callGemini   = async (prompt, prev = []) => {
  const history = [...prev.map(r => r.role === 'model' ? { role: 'model', parts: [{ text: r.content }] } : { role: 'user', parts: [{ text: r.content }] }), { role: 'user', parts: [{ text: prompt }] }];
  const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
    { contents: history }, { headers: { 'Content-Type': 'application/json' } });
  return data.candidates[0].content.parts[0].text;
};

const callGPT4     = async (prompt, prev = []) => {
  const msgs = [...prev.map(r => ({ role: r.role === 'model' ? 'assistant' : 'user', content: r.content })), { role: 'user', content: prompt }];
  const { data } = await axios.post('https://api.openai.com/v1/chat/completions',
    { model: 'gpt-4o', messages: msgs, max_tokens: 1200 },
    { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
  return data.choices[0].message.content;
};

const callDeepSeek = async (prompt, prev = []) => {
  const msgs = [...prev.map(r => ({ role: r.role === 'model' ? 'assistant' : 'user', content: r.content })), { role: 'user', content: prompt }];
  const { data } = await axios.post('https://api.deepseek.com/chat/completions',
    { model: 'deepseek-chat', messages: msgs, max_tokens: 1200 },
    { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' } });
  return data.choices[0].message.content;
};

/* ---------- Utilities ---------- */
function generatePrompt(seed, allRounds, roundNumber, mode = 'standard') {
  const tpl = MODE_TEMPLATES[mode] || MODE_TEMPLATES.standard;
  if (roundNumber === 1) return tpl.round1.replace('{seed}', seed);
  const prev = allRounds[roundNumber - 2];
  if (!prev || !Array.isArray(prev.responses)) return `Error retrieving context. Seed: "${seed}"`;
  const summary = prev.responses.map(r => `${r.ai}: "${r.content.slice(0, 300)}..."`).join('\n');
  return tpl.roundN.replace('{round}', roundNumber).replace('{seed}', seed).replace('{previousSummary}', summary);
}

function calculateResonance(allRounds) {
  if (!allRounds || allRounds.length < 2) return 0;
  let refs = 0, possible = 0;
  const terms = ['claude','gemini','gpt-4','deepseek','building on','resonates','weaving','synthesis','together'];
  allRounds.forEach((round, idx) => {
    if (idx === 0) return;
    round.responses.forEach(res => {
      possible += allRounds[idx - 1].responses.length;
      const txt = res.content.toLowerCase();
      terms.forEach(t => { if (txt.includes(t)) refs++; });
    });
  });
  return possible ? Math.min(100, (refs / possible) * 100) : 0;
}

async function generateSynthesis(seed, allRounds, mode = 'standard') {
  const tpl = MODE_TEMPLATES[mode] || MODE_TEMPLATES.standard;
  let summary = '';
  allRounds.forEach(round => {
    summary += `--- Round ${round.round} ---\n`;
    round.responses.forEach(res => summary += `${res.ai}: "${res.content}"\n`);
    summary += '\n';
  });
  const prompt = tpl.synthesis + `\n\nOriginal seed: "${seed}"\n\nCollaboration:\n${summary}`;
  return callClaude(prompt, []);
}

/* ---------- Routes ---------- */
app.get('/api/health', (_, res) =>
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), modes: Object.keys(MODE_TEMPLATES), message: '🌟 虛.fm Online' })
);

app.post('/api/collaborate', async (req, res) => {
  const { seed, mode = 'standard' } = req.body;
  if (!seed) return res.status(400).json({ error: 'Seed required' });
  try {
    const data = { seed, timestamp: new Date().toISOString(), mode, rounds: [] };
    data.rounds.push({ round: 1, responses: await orchestrateRound(seed, data.rounds, 1, mode) });
    data.rounds.push({ round: 2, responses: await orchestrateRound(seed, data.rounds, 2, mode) });
    data.resonance = calculateResonance(data.rounds);
    data.synthesis = { ai: 'Collective Intelligence', content: await generateSynthesis(seed, data.rounds, mode) };
    res.json(data);
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Collaboration failed' });
  }
});

app.post('/api/extend', async (req, res) => {
  const { transmissionId, previousRounds, seed, mode = 'standard' } = req.body;
  if (!transmissionId || !Array.isArray(previousRounds) || !seed) return res.status(400).json({ error: 'Missing data' });
  try {
    const rounds = [...previousRounds];
    const next = rounds.length + 1;
    rounds.push({ round: next, responses: await orchestrateRound(seed, rounds, next, mode) });
    const resonance = calculateResonance(rounds);
    const synthesis = { ai: 'Collective Intelligence', content: await generateSynthesis(seed, rounds, mode) };
    res.json({ seed, timestamp: transmissionId, mode, rounds, synthesis, resonance });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Extension failed' });
  }
});

app.post('/api/analyze-emergence', async (req, res) => {
  try {
    const { seed, rounds, synthesis } = req.body;
    if (!rounds || rounds.length < 1) return res.json([]);
    const content = [
      `DELEUZEAN COLLAB ANALYSIS\nSeed: "${seed}"\n`,
      ...rounds.map(r => `=== R${r.round} ===\n${r.responses.map(rp => `--- ${rp.ai} ---\n${rp.content}`).join('\n')}\n`),
      synthesis ? `=== SYNTHESIS ===\n${synthesis.content}\n` : ''
    ].join('');
    const prompt = `Return JSON array (max 12 items) of highlights:
[
  {"text":"phrase","type":"rhizomatic|assemblage|flight|mutation|difference","intensity":"low|medium|high","significance":"brief"}
]
CONTENT:\n${content}`;
    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      { model: 'claude-3-5-sonnet-20241022', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] },
      { headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } }
    );
    const raw = data.content[0].text;
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const highlights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const cleaned = highlights.filter(h =>
      h && typeof h === 'object' && ['rhizomatic','assemblage','flight','mutation','difference'].includes(h.type) &&
      ['low','medium','high'].includes(h.intensity) && h.text && h.significance
    ).slice(0, 12);
    res.json(cleaned);
  } catch (e) {
    console.error(e); res.json([]);
  }
});

/* ---------- Start ---------- */
app.listen(port, () =>
  console.log(`🌟 Void Radio 虛.fm running on ${port}\n📻 Modes: ${Object.keys(MODE_TEMPLATES).join(', ')}\n🧠 Deleuzean analysis at /api/analyze-emergence`)
);