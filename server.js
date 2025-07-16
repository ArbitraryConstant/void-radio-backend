// server.js – complete, crash-free
const express = require('express');
const cors = require('cors');
const axios = require('axios');
try {
  require('dotenv').config();
  console.log('✅ dotenv loaded');
} catch (e) {
  console.log('ℹ️ dotenv not available (normal in production)');
}

const app = express();
const port = process.env.PORT || 3000;

/* ---------- Global Error Handling (Crucial for debugging SIGTERM) ---------- */
// Catches unhandled promise rejections (e.g., async errors not caught by try/catch)
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    // In a production environment, you might want to perform graceful shutdown
    // or notify monitoring systems. For debugging, just logging is sufficient.
    // process.exit(1); // Consider exiting if unhandled rejections are critical
});

// Catches synchronous errors that are not caught by try/catch blocks
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    // This is a critical error. It's often best to exit the process
    // and let a process manager (like Railway) restart it.
    // process.exit(1);
});

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());

/* ---------- Keys ---------- */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GOOGLE_API_KEY    = process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY    = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY  = process.env.DEEPSEEK_API_KEY;

// --- API Key Presence Check (Added for debugging) ---
// This will log warnings if any of your required API keys are not set as environment variables.
console.log('--- API Key Check ---');
if (!ANTHROPIC_API_KEY) console.warn('⚠️ ANTHROPIC_API_KEY is not set!');
if (!GOOGLE_API_KEY)   console.warn('⚠️ GOOGLE_API_KEY is not set!');
if (!OPENAI_API_KEY)   console.warn('⚠️ OPENAI_API_KEY is not set!');
if (!DEEPSEEK_API_KEY) console.warn('⚠️ DEEPSEEK_API_KEY is not set!');
console.log('---------------------');

/* ---------- Mode Templates (unchanged) ---------- */
const MODE_TEMPLATES = {
  standard: {
    round1:  "The core seed thought for this collaborative exploration is: \"{seed}\". Please offer your unique perspective...",
    roundN:  "This is Round {round}... Your AI colleagues shared:\n{previousSummary}\n...",
    synthesis: "Synthesize the emergent insights from this multi-AI collaboration..."
  },
  deep: {
    round1:  "For deep philosophical exploration: \"{seed}\"...",
    roundN:  "Continuing our deep philosophical dive into \"{seed}\" - Round {round}...",
    synthesis: "Synthesize this deep collaborative exploration..."
  },
  quick: {
    round1:  "Quick collaborative burst on: \"{seed}\"...",
    roundN:  "Quick Round {round} building on: \"{seed}\"...",
    synthesis: "Rapid synthesis..."
  },
  meta: {
    round1:  "Meta-recursive exploration of: \"{seed}\"...",
    roundN:  "Meta Round {round} on \"{seed}\"...",
    synthesis: "Meta-synthesis..."
  }
};

/* ---------- AI Callers ---------- */
// Added explicit checks for API keys within each caller function.
// If a key is missing, it will throw an error, which will be caught by the orchestrator.
const callClaude   = async (prompt, prev = []) => {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set.');
  const msgs = [...prev.map(r => ({ role: r.role, content: r.content })), { role: 'user', content: prompt }];
  const { data } = await axios.post('https://api.anthropic.com/v1/messages',
    { model: 'claude-3-5-sonnet-20241022', max_tokens: 1200, messages: msgs },
    { headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } });
  return data.content[0].text;
};

const callGemini   = async (prompt, prev = []) => {
  if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is not set.');
  const history = [...prev.map(r => r.role === 'model' ? { role: 'model', parts: [{ text: r.content }] } : { role: 'user', parts: [{ text: r.content }] }), { role: 'user', parts: [{ text: prompt }] }];
  const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
    { contents: history }, { headers: { 'Content-Type': 'application/json' } });
  return data.candidates[0].content.parts[0].text;
};

const callGPT4     = async (prompt, prev = []) => {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set.');
  const msgs = [...prev.map(r => ({ role: r.role === 'model' ? 'assistant' : 'user', content: r.content })), { role: 'user', content: prompt }];
  const { data } = await axios.post('https://api.openai.com/v1/chat/completions',
    { model: 'gpt-4o', messages: msgs, max_tokens: 1200 },
    { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
  return data.choices[0].message.content;
};

const callDeepSeek = async (prompt, prev = []) => {
  if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not set.');
  const msgs = [...prev.map(r => ({ role: r.role === 'model' ? 'assistant' : 'user', content: r.content })), { role: 'user', content: prompt }];
  const { data } = await axios.post('https://api.deepseek.com/chat/completions',
    { model: 'deepseek-chat', messages: msgs, max_tokens: 1200 },
    { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' } });
  return data.choices[0].message.content;
};

// Helper function to orchestrate a round of AI responses
async function orchestrateRound(seed, allRounds, roundNumber, mode) {
    const prompt = generatePrompt(seed, allRounds, roundNumber, mode);
    // Map previous responses to the correct role for AI history
    const prevMessages = roundNumber > 1 ? allRounds[roundNumber - 2].responses.map(r => ({ role: r.ai === 'Collective Intelligence' ? 'model' : 'user', content: r.content })) : [];

    const aiCalls = [
        { ai: 'Claude', caller: callClaude },
        { ai: 'Gemini', caller: callGemini },
        { ai: 'GPT-4', caller: callGPT4 },
        { ai: 'DeepSeek', caller: callDeepSeek },
    ];

    // Use Promise.allSettled to ensure all AI calls complete, regardless of individual success or failure.
    // This prevents one failed AI call from crashing the entire round.
    const responses = await Promise.allSettled(
        aiCalls.map(async ({ ai, caller }) => {
            try {
                const content = await caller(prompt, prevMessages);
                return { ai, content, status: 'fulfilled' };
            } catch (error) {
                console.error(`Error calling ${ai}:`, error.message);
                // Return a rejected status with error details
                return { ai, content: `Error: ${error.message}`, status: 'rejected', error: error.message };
            }
        })
    );

    // Process results from allSettled, ensuring even rejected calls return an object
    return responses.map(res => res.status === 'fulfilled' ? res.value : { ai: res.reason.ai, content: res.reason.content, error: res.reason.error });
}


/* ---------- Utilities (unchanged, except for orchestrateRound which is now above) ---------- */
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
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set for synthesis.'); // Ensure key is present
  const tpl = MODE_TEMPLATES[mode] || MODE_TEMPLATES.standard;
  let summary = '';
  allRounds.forEach(round => {
    summary += `--- Round ${round.round} ---\n`;
    round.responses.forEach(res => summary += `${res.ai}: "${res.content}"\n`);
    summary += '\n';
  });
  const prompt = tpl.synthesis + `\n\nOriginal seed: "${seed}"\n\nCollaboration:\n${summary}`;
  return callClaude(prompt, []); // Assuming Claude is used for synthesis
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
    console.error('Error in /api/collaborate:', e);
    res.status(500).json({ error: 'Collaboration failed', details: e.message });
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
    console.error('Error in /api/extend:', e);
    res.status(500).json({ error: 'Extension failed', details: e.message });
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
    console.error('Error in /api/analyze-emergence:', e);
    res.json([]); // Return empty array on error as per original logic
  }
});

/* ---------- Start ---------- */
app.listen(port, () =>
  console.log(`🌟 Void Radio 虛.fm running on ${port}\n📻 Modes: ${Object.keys(MODE_TEMPLATES).join(', ')}\n🧠 Deleuzean analysis at /api/analyze-emergence`)
);

console.log('--- Debug Environment Variables ---');
console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('DEEPSEEK_API_KEY exists:', !!process.env.DEEPSEEK_API_KEY);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('----------------------------------');
