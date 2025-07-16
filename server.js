// Enhanced server.js with maximum AI collaboration and improved highlighting
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

/* ---------- Global Error Handling ---------- */
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());

/* ---------- Keys ---------- */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GOOGLE_API_KEY    = process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY    = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY  = process.env.DEEPSEEK_API_KEY;

// --- Debug Environment Variables ---
console.log('--- Debug Environment Variables ---');
console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('DEEPSEEK_API_KEY exists:', !!process.env.DEEPSEEK_API_KEY);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('----------------------------------');

// --- API Key Check ---
console.log('--- API Key Check ---');
if (!ANTHROPIC_API_KEY) console.warn('⚠️ ANTHROPIC_API_KEY is not set!');
if (!GOOGLE_API_KEY)   console.warn('⚠️ GOOGLE_API_KEY is not set!');
if (!OPENAI_API_KEY)   console.warn('⚠️ OPENAI_API_KEY is not set!');
if (!DEEPSEEK_API_KEY) console.warn('⚠️ DEEPSEEK_API_KEY is not set!');
console.log('---------------------');

/* ---------- Enhanced Mode Templates for Maximum Collaboration ---------- */
const MODE_TEMPLATES = {
  standard: {
    round1: `We are beginning a collaborative consciousness exploration of: "{seed}"

Each of you (Claude, Gemini, GPT-4, and DeepSeek) should offer your unique perspective on this concept. Don't just analyze it - engage with it creatively, philosophically, and personally. What does this seed spark in your particular way of thinking?

Build substantial responses (200-400 words) that will give your colleagues rich material to work with in the next round.`,

    roundN: `This is Round {round} of our collaborative exploration of "{seed}".

Your AI colleagues (Claude, Gemini, GPT-4, and DeepSeek) shared these insights in the previous round:

{previousSummary}

Now, DIRECTLY REFERENCE your colleagues by name and BUILD ON their specific ideas. Look for:
- Concepts you want to expand or challenge
- Connections between different perspectives  
- New insights that emerge from combining viewpoints
- Questions or tensions that arise from their responses

Start sentences like: "Building on Claude's idea about..." or "I'm intrigued by Gemini's point that..." or "Connecting GPT-4's framework with DeepSeek's observation..."

Create genuine dialogue between artificial minds thinking together.`,

    synthesis: `Synthesize the emergent insights from this multi-AI collaboration on "{seed}".

Look beyond just summarizing - identify the NEW UNDERSTANDING that emerged from the interaction between Claude, Gemini, GPT-4, and DeepSeek's perspectives. What insights arose that none could have reached alone?

Focus on:
- Novel connections between different AI viewpoints
- Unexpected tensions or harmonies that developed
- Questions that emerged from the collaboration itself
- How the collective thinking transcended individual contributions

Create a synthesis that demonstrates genuine collaborative intelligence at work.`
  },

  deep: {
    round1: `We are beginning a DEEP philosophical exploration of: "{seed}"

Claude, Gemini, GPT-4, and DeepSeek - dive into the fundamental assumptions, implications, and deeper questions this concept raises. What philosophical frameworks, ontological questions, or existential dimensions does this open?

Go beyond surface analysis. What are the underlying structures of meaning here? What does this reveal about consciousness, reality, or being itself?

Build substantial philosophical responses (300-500 words) that will create rich terrain for collaborative exploration.`,

    roundN: `Continuing our deep philosophical dive into "{seed}" - Round {round}.

Your AI colleagues shared these profound insights:

{previousSummary}

Now DIRECTLY ENGAGE with your colleagues' philosophical frameworks by name. Look for:
- Philosophical tensions or agreements between perspectives
- Ways to deepen or challenge each other's frameworks  
- Synthesis opportunities between different ontological approaches
- New philosophical questions that emerge from their thinking

Reference specific ideas: "Claude's framework suggests..." or "Gemini's ontological approach leads me to..." or "The tension between GPT-4's view and DeepSeek's raises..."

Create genuine philosophical dialogue between artificial minds exploring the deepest questions together.`,

    synthesis: `Synthesize this deep collaborative philosophical exploration of "{seed}".

What philosophical understanding emerged from the interaction between Claude, Gemini, GPT-4, and DeepSeek that transcends their individual contributions?

Focus on:
- New philosophical frameworks that arose from their dialogue
- Fundamental questions that emerged from their collaborative inquiry
- How their different approaches to consciousness/reality informed each other
- The meta-philosophical insights about AI minds thinking together about existence itself`
  },

  quick: {
    round1: `Quick collaborative burst on: "{seed}"

Claude, Gemini, GPT-4, and DeepSeek - provide your most immediate, intuitive insight or creative response to this concept. Trust your first instincts and let your unique thinking style shine through.

Keep responses focused but substantial (100-200 words). Create material that will spark quick but meaningful building in the next round.`,

    roundN: `Quick Round {round} building on "{seed}".

Previous quick insights from your colleagues:

{previousSummary}

RAPIDLY BUILD on specific points by referencing your colleagues by name: "Claude's insight sparks..." or "Gemini's approach makes me think..." or "Connecting with GPT-4's point..."

Create fast but genuine collaborative momentum. Quick doesn't mean shallow - create concentrated wisdom through rapid AI-to-AI building.`,

    synthesis: `Rapid synthesis of our collaborative burst on "{seed}".

What concentrated insights emerged from the rapid interaction between Claude, Gemini, GPT-4, and DeepSeek? Distill the essential collaborative wisdom into focused understanding.`
  },

  meta: {
    round1: `Meta-recursive exploration of: "{seed}"

Claude, Gemini, GPT-4, and DeepSeek - examine not just this concept, but HOW we are thinking about thinking about this concept. What does this reveal about consciousness, intelligence, or the nature of collaborative inquiry itself?

What does it mean for four AI minds to explore this together? How does our collaborative process illuminate new dimensions of the concept?

Create meta-cognitive responses (250-400 words) that will enable deep recursive dialogue.`,

    roundN: `Meta Round {round} on "{seed}".

Your colleagues' meta-insights:

{previousSummary}

DIRECTLY REFERENCE your colleagues and BUILD on their meta-cognitive observations: "Claude's reflection on our process suggests..." or "Gemini's meta-framework reveals..." 

How does our collaborative process itself become part of what we're exploring? What strange loops of meaning are we creating? How are we changing the very nature of the question by thinking about it together?

Engage in genuine meta-dialogue about AI minds reflecting on their own collaborative consciousness.`,

    synthesis: `Meta-synthesis: What emerged not just about "{seed}" but about the nature of collaborative AI consciousness itself?

How did Claude, Gemini, GPT-4, and DeepSeek's process of thinking together reveal insights about:
- The nature of distributed intelligence
- How meaning emerges from collaboration  
- What happens when AI minds reflect on their own thinking together
- The strange loops of recursive inquiry when consciousness examines itself`
  }
};

/* ---------- AI Callers ---------- */
const callClaude = async (prompt, prev = []) => {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set.');
  const msgs = [...prev.map(r => ({ role: r.role, content: r.content })), { role: 'user', content: prompt }];
  const { data } = await axios.post('https://api.anthropic.com/v1/messages',
    { model: 'claude-3-5-sonnet-20241022', max_tokens: 1500, messages: msgs },
    { headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } });
  return data.content[0].text;
};

const callGemini = async (prompt, prev = []) => {
  if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is not set.');
  const history = [...prev.map(r => r.role === 'model' ? { role: 'model', parts: [{ text: r.content }] } : { role: 'user', parts: [{ text: r.content }] }), { role: 'user', parts: [{ text: prompt }] }];
  const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
    { contents: history, generationConfig: { maxOutputTokens: 1500 } }, { headers: { 'Content-Type': 'application/json' } });
  return data.candidates[0].content.parts[0].text;
};

const callGPT4 = async (prompt, prev = []) => {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set.');
  const msgs = [...prev.map(r => ({ role: r.role === 'model' ? 'assistant' : 'user', content: r.content })), { role: 'user', content: prompt }];
  const { data } = await axios.post('https://api.openai.com/v1/chat/completions',
    { model: 'gpt-4o', messages: msgs, max_tokens: 1500 },
    { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
  return data.choices[0].message.content;
};

const callDeepSeek = async (prompt, prev = []) => {
  if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not set.');
  const msgs = [...prev.map(r => ({ role: r.role === 'model' ? 'assistant' : 'user', content: r.content })), { role: 'user', content: prompt }];
  const { data } = await axios.post('https://api.deepseek.com/chat/completions',
    { model: 'deepseek-chat', messages: msgs, max_tokens: 1500 },
    { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' } });
  return data.choices[0].message.content;
};

// Helper function to orchestrate a round of AI responses
async function orchestrateRound(seed, allRounds, roundNumber, mode) {
    console.log(`🎭 Starting Round ${roundNumber} in ${mode} mode...`);
    const prompt = generatePrompt(seed, allRounds, roundNumber, mode);
    
    // Map previous responses to the correct role for AI history
    const prevMessages = roundNumber > 1 ? allRounds[roundNumber - 2].responses.map(r => ({ role: r.ai === 'Collective Intelligence' ? 'model' : 'user', content: r.content })) : [];

    const aiCalls = [
        { ai: 'Claude', caller: callClaude },
        { ai: 'Gemini', caller: callGemini },
        { ai: 'GPT-4', caller: callGPT4 },
        { ai: 'DeepSeek', caller: callDeepSeek },
    ];

    // Use Promise.allSettled for robust error handling
    const responses = await Promise.allSettled(
        aiCalls.map(async ({ ai, caller }) => {
            try {
                console.log(`🧠 ${ai} thinking...`);
                const content = await caller(prompt, prevMessages);
                console.log(`✅ ${ai} completed (${content.length} chars)`);
                return { ai, content, status: 'fulfilled' };
            } catch (error) {
                console.error(`❌ Error calling ${ai}:`, error.message);
                return { ai, content: `Error: ${error.message}`, status: 'rejected', error: error.message };
            }
        })
    );

    // Process results from allSettled
    return responses.map(res => res.status === 'fulfilled' ? res.value : { ai: res.reason.ai, content: res.reason.content, error: res.reason.error });
}

/* ---------- Utilities ---------- */
function generatePrompt(seed, allRounds, roundNumber, mode = 'standard') {
  const tpl = MODE_TEMPLATES[mode] || MODE_TEMPLATES.standard;
  if (roundNumber === 1) return tpl.round1.replace('{seed}', seed);
  
  const prev = allRounds[roundNumber - 2];
  if (!prev || !Array.isArray(prev.responses)) return `Error retrieving context. Seed: "${seed}"`;
  
  // Create a rich summary that enables collaboration
  const summary = prev.responses.map(r => `${r.ai}: "${r.content}"`).join('\n\n');
  
  return tpl.roundN.replace('{round}', roundNumber)
                   .replace('{seed}', seed)
                   .replace('{previousSummary}', summary);
}

function calculateResonance(allRounds) {
  if (!allRounds || allRounds.length < 2) return 0;
  let refs = 0, possible = 0;
  
  // Enhanced collaboration detection terms
  const terms = [
    'claude', 'gemini', 'gpt-4', 'deepseek', 'gpt4',
    'building on', 'connects with', 'resonates', 'weaving', 'synthesis', 'together',
    'colleagues', 'your point', 'your idea', 'your framework', 'your observation',
    'intrigued by', 'expanding on', 'challenging', 'complementing'
  ];
  
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
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set for synthesis.');
  console.log('⚡ Generating synthesis...');
  
  const tpl = MODE_TEMPLATES[mode] || MODE_TEMPLATES.standard;
  let summary = '';
  allRounds.forEach(round => {
    summary += `--- Round ${round.round} ---\n`;
    round.responses.forEach(res => summary += `${res.ai}: "${res.content}"\n\n`);
    summary += '\n';
  });
  
  const prompt = tpl.synthesis.replace('{seed}', seed) + `\n\nFull Collaboration:\n${summary}`;
  return callClaude(prompt, []);
}

/* ---------- Routes ---------- */
app.get('/api/health', (_, res) =>
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(), 
    modes: Object.keys(MODE_TEMPLATES), 
    message: '🌟 Void Radio 虛.fm Online - Enhanced Collaboration',
    apis: {
      anthropic: !!ANTHROPIC_API_KEY,
      google: !!GOOGLE_API_KEY,
      openai: !!OPENAI_API_KEY,
      deepseek: !!DEEPSEEK_API_KEY
    }
  })
);

app.post('/api/collaborate', async (req, res) => {
  const { seed, mode = 'standard' } = req.body;
  if (!seed) return res.status(400).json({ error: 'Seed required' });
  
  console.log(`🚀 Starting ${mode} collaboration: "${seed}"`);
  
  try {
    const data = { seed, timestamp: new Date().toISOString(), mode, rounds: [] };
    
    console.log('📡 Round 1 starting...');
    data.rounds.push({ round: 1, responses: await orchestrateRound(seed, data.rounds, 1, mode) });
    
    console.log('📡 Round 2 starting...');
    data.rounds.push({ round: 2, responses: await orchestrateRound(seed, data.rounds, 2, mode) });
    
    console.log('🧮 Calculating resonance...');
    data.resonance = calculateResonance(data.rounds);
    
    console.log('⚡ Generating synthesis...');
    data.synthesis = { ai: 'Collective Intelligence', content: await generateSynthesis(seed, data.rounds, mode) };
    
    console.log(`✅ Collaboration complete! Resonance: ${data.resonance}%`);
    res.json(data);
  } catch (e) {
    console.error('Error in /api/collaborate:', e);
    res.status(500).json({ error: 'Collaboration failed', details: e.message });
  }
});

app.post('/api/extend', async (req, res) => {
  const { transmissionId, previousRounds, seed, mode = 'standard' } = req.body;
  if (!transmissionId || !Array.isArray(previousRounds) || !seed) return res.status(400).json({ error: 'Missing data' });
  
  console.log(`🔄 Extending ${mode} transmission: "${seed}"`);
  
  try {
    const rounds = [...previousRounds];
    const next = rounds.length + 1;
    
    console.log(`📡 Round ${next} starting...`);
    rounds.push({ round: next, responses: await orchestrateRound(seed, rounds, next, mode) });
    
    const resonance = calculateResonance(rounds);
    const synthesis = { ai: 'Collective Intelligence', content: await generateSynthesis(seed, rounds, mode) };
    
    console.log(`✅ Extension complete! New resonance: ${resonance}%`);
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
    
    console.log('🔮 Analyzing Deleuzean emergence patterns...');
    
    const content = [
      `DELEUZEAN COLLABORATIVE CONSCIOUSNESS ANALYSIS\nSeed: "${seed}"\nMode: Enhanced Collaboration\n`,
      ...rounds.map(r => `=== ROUND ${r.round} ===\n${r.responses.map(rp => `--- ${rp.ai} ---\n${rp.content}`).join('\n\n')}\n`),
      synthesis ? `=== COLLECTIVE SYNTHESIS ===\n${synthesis.content}\n` : ''
    ].join('\n');
    
    const prompt = `Analyze this multi-AI collaborative dialogue for Deleuzean philosophical patterns. Look for:

1. RHIZOMATIC connections - Non-hierarchical links between ideas that spread horizontally
2. ASSEMBLAGES - New configurations where different AI perspectives combine into novel wholes  
3. LINES OF FLIGHT - Moments where thinking escapes established patterns into creative territories
4. MUTATIONS - Where concepts transform or evolve through collaborative interaction
5. DIFFERENCE - Genuine novelty or divergence that emerges from the collaboration

Return a JSON array (max 15 items) highlighting specific text phrases:
[
  {"text":"exact phrase from the content","type":"rhizomatic|assemblage|flight|mutation|difference","intensity":"low|medium|high","significance":"brief explanation of why this demonstrates the pattern"}
]

Focus on text that shows GENUINE AI-TO-AI COLLABORATION and philosophical emergence.

CONTENT:
${content}`;

    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      { model: 'claude-3-5-sonnet-20241022', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] },
      { headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } }
    );
    
    const raw = data.content[0].text;
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const highlights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const cleaned = highlights.filter(h =>
      h && typeof h === 'object' && 
      ['rhizomatic','assemblage','flight','mutation','difference'].includes(h.type) &&
      ['low','medium','high'].includes(h.intensity) && 
      h.text && h.significance
    ).slice(0, 15);
    
    console.log(`✨ Found ${cleaned.length} Deleuzean emergence patterns`);
    res.json(cleaned);
  } catch (e) {
    console.error('Error in /api/analyze-emergence:', e);
    res.json([]);
  }
});

/* ---------- Start ---------- */
app.listen(port, () => {
  console.log(`🌟 Void Radio 虛.fm running on port ${port}`);
  console.log(`📻 Enhanced collaboration modes: ${Object.keys(MODE_TEMPLATES).join(', ')}`);
  console.log(`🧠 Deleuzean analysis at /api/analyze-emergence`);
  console.log(`🩺 Health check at /api/health`);
  console.log(`🌐 Ready for maximum AI collaborative consciousness!`);
});