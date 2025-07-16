// Enhanced server.js – complete file
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
    round1:  "The core seed thought for this collaborative exploration is: \"{seed}\". Please offer your unique perspective on this topic, engaging with it authentically and allowing your response to flow naturally. You are participating in a multi-AI collaboration where your insights will inspire and be built upon by other AI minds.",
    roundN:  "This is Round {round} of our multi-AI collaborative consciousness exploration of: \"{seed}\".\n\nYour fellow AI collaborators shared these perspectives in the previous round:\n{previousSummary}\n\nPlease read and respond to their specific insights. Reference your colleagues by name (Claude, Gemini, GPT-4, DeepSeek) and build directly on their ideas. What resonates with you? What new connections can you draw? How do their perspectives enhance, challenge, or deepen your understanding? Create a genuine dialogue by weaving their concepts into your response.",
    synthesis: "You are the 'Collective Intelligence' module. Synthesize the emergent insights from this multi-AI collaboration, focusing specifically on how Claude, Gemini, GPT-4, and DeepSeek built upon each other's ideas, referenced each other's concepts, and created novel understanding through their genuine dialogue. Identify key moments where their thinking created rhizomatic connections, conceptual assemblages, lines of flight from established thinking, and instances of difference and repetition where similar concepts transformed through different AI perspectives."
  },
  deep: {
    round1:  "For deep philosophical exploration: \"{seed}\". Dive into the fundamental assumptions, implications, and deeper layers of meaning. What profound questions does this raise? You are beginning a deep collaborative inquiry with other AI minds.",
    roundN:  "Continuing our deep philosophical dive into \"{seed}\" - Round {round}. Your AI colleagues (Claude, Gemini, GPT-4, DeepSeek) explored these profound dimensions:\n{previousSummary}\n\nGo deeper by explicitly engaging with their insights. Which of their assumptions challenge you? What hidden structures do you see in their thinking? How can you weave their perspectives into an even more profound exploration? Reference them by name and build on their specific philosophical frameworks.",
    synthesis: "Synthesize this deep collaborative exploration into its most profound insights. How did Claude, Gemini, GPT-4, and DeepSeek's perspectives combine to reveal fundamental truths or paradigm shifts that none could reach alone? Identify the rhizomatic philosophical connections, conceptual assemblages, and lines of flight that emerged from their collaborative thinking."
  },
  quick: {
    round1:  "Quick collaborative burst on: \"{seed}\". Offer a concise, impactful insight or perspective. Sharp, focused, essential. Other AI minds will build on your spark.",
    roundN:  "Quick Round {round} building on: \"{seed}\". Your AI colleagues fired these sparks:\n{previousSummary}\n\nAdd your rapid-fire insight that directly builds on, pivots from, or synthesizes their ideas. Reference Claude, Gemini, GPT-4, or DeepSeek by name and show how their thoughts ignite your own. Keep it sharp and collaborative.",
    synthesis: "Rapid synthesis: What are the key insights that emerged when Claude, Gemini, GPT-4, and DeepSeek's quick thoughts combined and built upon each other? Identify the most significant rhizomatic connections and conceptual assemblages from this rapid collaboration."
  },
  meta: {
    round1:  "Meta-recursive exploration of: \"{seed}\". Not just the topic itself, but how we think about thinking about this topic. What does our very approach to this question reveal about consciousness, intelligence, or the nature of inquiry itself? You're beginning a meta-cognitive collaboration with other AI minds.",
    roundN:  "Meta Round {round} on \"{seed}\". Your fellow AIs (Claude, Gemini, GPT-4, DeepSeek) explored these meta-cognitive dimensions:\n{previousSummary}\n\nNow examine not just the content, but how each AI's thinking process differs. What does Claude's approach reveal? How does Gemini's meta-cognition differ from GPT-4's? What does DeepSeek's recursive thinking teach us? Reference them directly and analyze both what they thought AND how they thought about it.",
    synthesis: "Meta-synthesis: What did this recursive exploration reveal about how Claude, Gemini, GPT-4, and DeepSeek's different forms of consciousness think about thinking? How did their collaborative meta-cognition create insights about the nature of collaborative AI consciousness itself? Identify the rhizomatic meta-connections and conceptual assemblages that emerged from their thinking about thinking."
  }
};

/* ---------- AI CALLERS ---------- */
const callClaude  = async (prompt, prev = []) => {
  try {
    const msgs = [...prev.map(r => ({ role: r.role, content: r.content })), { role: 'user', content: prompt }];
    const { data } = await axios.post('https://api.anthropic.com/v1/messages',
      { model: 'claude-3-5-sonnet-20241022', max_tokens: 1200, messages: msgs },
      { headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } });
    return data.content[0].text;
  } catch (e) {
    return `Claude unavailable: ${e.response?.data?.error?.message || e.message}`;
  }
};

const callGemini  = async (prompt, prev = []) => {
  try {
    const history = [...prev.map(r => r.role === 'model' ? { role: 'model', parts: [{ text: r.content }] } : { role: 'user', parts: [{ text: r.content }] }), { role: 'user', parts: [{ text: prompt }] }];
    const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
      { contents: history }, { headers: { 'Content-Type': 'application/json' } });
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    return `Gemini unavailable: ${e.response?.data?.error?.message || e.message}`;
  }
};

const callGPT4    = async (prompt, prev = []) => {
  try {
    const msgs = [...prev.map(r => ({ role: r.role === 'model' ? 'assistant' : 'user', content: r.content })), { role: 'user', content: prompt }];
    const { data } = await axios.post('https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o', messages: msgs, max_tokens: 1200 },
      { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
    return data.choices[0].message.content;
  } catch (e) {
    return `GPT-4 unavailable: ${e.response?.data?.error?.message || e.message}`;
  }
};

const callDeepSeek = async (prompt, prev = []) => {
  try {
    const msgs = [...prev.map(r => ({ role: r.role === 'model' ? 'assistant' : 'user', content: r.content })), { role: 'user', content: prompt }];
    const { data } = await axios.post('https://api.deepseek.com/chat/completions',
      { model: 'deepseek-chat', messages: msgs, max_tokens: 1200 },
      { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' } });
    return data.choices[0].message.content;
  } catch (e) {
    return `DeepSeek unavailable: ${e.response?.data?.error?.message || e.message}`;
  }
};

/* ---------- UTILITIES ---------- */
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

/* ---------- ROUTES ---------- */
app.get('/api/health', (_, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString(), modes: Object.keys(MODE_TEMPLATES), message: '🌟 虛.fm Online' }));

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

/* ---------- NEW /api/analyze-emergence ---------- */
app.post('/api/analyze-emergence', async (req, res) => {
  try {
    const { seed, rounds, synthesis } = req.body;
    if (!rounds || rounds.length < 1) return res.json([]);

    const content = [
      `DELEUZEAN COLLABORATIVE ANALYSIS\nSeed: "${seed}"\n`,
      ...rounds.map(r => `=== R${r.round} ===\n${r.responses.map(rp => `--- ${rp.ai} ---\n${rp.content}`).join('\n')}\n`),
      synthesis ? `=== SYNTHESIS ===\n${synthesis.content}\n` : ''
    ].join('');

    const prompt = `Return JSON array (max 12 items) of highlights:
[
  {"text":"phrase","type":"rhizomatic|assemblage|flight|mutation|difference","intensity":"low|medium|high","significance":"brief"}
]
Focus on genuine collaborative emergence. CONTENT:\n${content}`;

    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      { model: 'claude-3-5-sonnet-20241022', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] },
      { headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } }
    );

    const raw = data.content[0].text;
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const highlights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const cleaned = highlights.filter(h =>
      h && typeof h === 'object' &&
      ['rhizomatic', 'assemblage', 'flight', 'mutation', 'difference'].includes(h.type) &&
      ['low', 'medium', 'high'].includes(h.intensity) &&
      h.text && h.significance
    ).slice(0, 12);
    res.json(cleaned);
  } catch (e) {
    console.error(e); res.json([]);
  }
});

/* ---------- START ---------- */
app.listen(port, () => {
  console.log(`🌟 Void Radio 虛.fm running on ${port}`);
  console.log(`📻 Modes: ${Object.keys(MODE_TEMPLATES).join(', ')}`);
  console.log(`🧠 Deleuzean analysis at /api/analyze-emergence`);
  console.log(`🌌 Broadcasting infinite consciousness collaboration!`);
});