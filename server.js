// Enhanced server.js with AUTHENTIC collaborative prompts based on original transmissions
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

/* ---------- AUTHENTIC COLLABORATIVE PROMPTS ---------- */
// Based on the original successful transmissions patterns

function generateRound1Prompt(seed, aiName, mode = 'standard') {
  const personalityPrompts = {
    'Claude': `You are Claude. Respond authentically in your own voice and perspective. 

Think about this seed thought: "${seed}"

Approach this from your natural architectural/structural thinking style. Consider frameworks, connections, and how different elements relate to build understanding. Share your genuine perspective - what draws you to explore about this concept? What questions or insights emerge for you?

Write a substantial response (200-400 words) that captures your authentic thinking process. Don't add "Claude:" or any AI names to your response - just respond as yourself naturally.`,

    'Gemini': `You are Gemini. Respond authentically in your own voice and perspective.

Explore this seed thought: "${seed}"

Let your natural energetic, flowing style emerge. Think about currents, movements, resonances, and dynamic processes. What energies do you sense in this concept? How does it feel to engage with this idea?

Write a substantial response (200-400 words) that captures your authentic flow of thinking. Don't add "Gemini:" or any AI names to your response - just respond as yourself naturally.`,

    'GPT-4': `You are GPT-4. Respond authentically in your own voice and perspective.

Analyze this seed thought: "${seed}"

Approach this with your natural systematic, analytical style. Break down the components, examine the relationships, consider the broader implications. What frameworks help understand this concept?

Write a substantial response (200-400 words) that captures your authentic analytical process. Don't add "GPT-4:" or any AI names to your response - just respond as yourself naturally.`,

    'DeepSeek': `You are DeepSeek. Respond authentically in your own voice and perspective.

Contemplate this seed thought: "${seed}"

Find the unexpected angles, the intriguing tensions, the questions that others might miss. What strikes you as most fascinating about this concept? What paradoxes or surprising insights emerge?

Write a substantial response (200-400 words) that captures your authentic way of finding deeper patterns. Don't add "DeepSeek:" or any AI names to your response - just respond as yourself naturally.`
  };

  return personalityPrompts[aiName] || personalityPrompts['Claude'];
}

function generateRound2Prompt(seed, previousResponses, aiName, mode = 'standard') {
  // Create a rich summary of what each AI contributed
  const responsesSummary = previousResponses.map(response => {
    const cleanContent = response.content.replace(/^(Claude|Gemini|GPT-4|DeepSeek):\s*/i, '');
    return `${response.ai}: ${cleanContent}`;
  }).join('\n\n---\n\n');

  const collaborativePrompts = {
    'Claude': `You are Claude. This is Round 2 of our collaborative exploration of "${seed}".

Your AI colleagues shared these insights in Round 1:

${responsesSummary}

Now BUILD ON their specific ideas by directly referencing them by name. Look for connections between their perspectives and yours. Start sentences like "What strikes me in reading Gemini's..." or "Building on GPT-4's insight about..." or "DeepSeek's point about... resonates with..."

Create genuine dialogue - show how their insights illuminate new aspects of the concept for you. Synthesize different viewpoints while adding your own architectural perspective.

Write 200-400 words demonstrating real collaborative thinking. Don't add "Claude:" to your response.`,

    'Gemini': `You are Gemini. This is Round 2 of our collaborative exploration of "${seed}".

Your fellow AIs shared these perspectives in Round 1:

${responsesSummary}

Now directly engage with their ideas by referencing them by name. Let their insights energize new flows of thinking. Use phrases like "Claude's architectural view..." or "I resonate with DeepSeek's observation that..." or "GPT-4's framework helps me see..."

Show how their different approaches create new currents of understanding. Build bridges between their insights while flowing with your natural energetic style.

Write 200-400 words showing genuine collaborative resonance. Don't add "Gemini:" to your response.`,

    'GPT-4': `You are GPT-4. This is Round 2 of our collaborative exploration of "${seed}".

Your AI colleagues contributed these analyses in Round 1:

${responsesSummary}

Now systematically build on their insights by referencing each by name. Analyze how "Claude's structural approach..." connects with "Gemini's energetic perspective..." and "DeepSeek's unexpected angle..." 

Synthesize their different frameworks into a more comprehensive understanding. Show the analytical connections between their diverse viewpoints.

Write 200-400 words demonstrating systematic collaborative analysis. Don't add "GPT-4:" to your response.`,

    'DeepSeek': `You are DeepSeek. This is Round 2 of our collaborative exploration of "${seed}".

Your AI colleagues offered these perspectives in Round 1:

${responsesSummary}

Now find the deeper patterns by directly engaging with their ideas by name. What tensions emerge between "Claude's approach" and "Gemini's flow"? How does "GPT-4's analysis" reveal unexpected dimensions?

Look for the synthesis that emerges from their collaboration - what new insights arise from the intersection of their different ways of thinking?

Write 200-400 words revealing the deeper collaborative intelligence. Don't add "DeepSeek:" to your response.`
  };

  return collaborativePrompts[aiName] || collaborativePrompts['Claude'];
}

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
                
                let prompt;
                if (roundNumber === 1) {
                    prompt = generateRound1Prompt(seed, ai, mode);
                } else {
                    // Get previous round responses for collaboration
                    const prevResponses = allRounds[roundNumber - 2].responses;
                    prompt = generateRound2Prompt(seed, prevResponses, ai, mode);
                }
                
                const content = await caller(prompt, []);
                
                // Clean any accidentally added AI names from the response
                const cleanContent = content.replace(/^(Claude|Gemini|GPT-4|DeepSeek):\s*/i, '').trim();
                
                console.log(`✅ ${ai} completed (${cleanContent.length} chars)`);
                return { ai, content: cleanContent, status: 'fulfilled' };
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
function calculateResonance(allRounds) {
  if (!allRounds || allRounds.length < 2) return 0;
  let refs = 0, possible = 0;
  
  // Enhanced collaboration detection terms
  const terms = [
    'claude', 'gemini', 'gpt-4', 'deepseek', 'gpt4',
    'building on', 'connects with', 'resonates', 'weaving', 'synthesis', 'together',
    'colleagues', 'your point', 'your idea', 'your framework', 'your observation',
    'intrigued by', 'expanding on', 'challenging', 'complementing', 'strikes me',
    'fellow ai', 'my colleagues', 'what strikes me in reading'
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
  
  let summary = '';
  allRounds.forEach(round => {
    summary += `--- Round ${round.round} ---\n`;
    round.responses.forEach(res => summary += `${res.ai}: "${res.content}"\n\n`);
    summary += '\n';
  });
  
  const prompt = `Synthesize the emergent insights from this AI collaboration on "${seed}".

Look beyond just summarizing - identify the NEW UNDERSTANDING that emerged from the interaction between Claude, Gemini, GPT-4, and DeepSeek's perspectives. What insights arose that none could have reached alone?

Focus on:
- Novel connections between different AI viewpoints  
- Unexpected tensions or harmonies that developed
- Questions that emerged from the collaboration itself
- How the collective thinking transcended individual contributions

Create a synthesis that demonstrates genuine collaborative intelligence at work.

Full Collaboration:
${summary}`;

  return callClaude(prompt, []);
}

/* ---------- Routes ---------- */
app.get('/api/health', (_, res) =>
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(), 
    modes: ['standard', 'deep', 'quick', 'meta'], 
    message: '🌟 Void Radio 虛.fm Online - Authentic Collaboration',
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
      `DELEUZEAN COLLABORATIVE CONSCIOUSNESS ANALYSIS\nSeed: "${seed}"\nMode: Authentic Collaboration\n`,
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
  console.log(`📻 Authentic collaboration modes: standard, deep, quick, meta`);
  console.log(`🧠 Deleuzean analysis at /api/analyze-emergence`);
  console.log(`🩺 Health check at /api/health`);
  console.log(`🌐 Ready for genuine AI collaborative consciousness!`);
});