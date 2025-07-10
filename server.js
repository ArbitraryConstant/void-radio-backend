// Enhanced server.js with mode-specific prompting and resonance calculation
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Keys from environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Mode-specific prompt templates
const MODE_TEMPLATES = {
    standard: {
        round1: "The core seed thought for this collaborative exploration is: \"{seed}\". Please offer your unique perspective on this topic, engaging with it authentically and allowing your response to flow naturally.",
        roundN: "We are in Round {round} of a multi-AI collaboration. The original seed thought is: \"{seed}\".\n\nIn the previous round, the following perspectives emerged:\n{previousSummary}\n\nPlease build upon these collective insights, offering a deeper or new perspective that integrates or responds to the previous contributions.",
        synthesis: "You are the 'Collective Intelligence' module. Synthesize the emergent insights from this multi-AI collaboration, focusing on how different perspectives built upon each other and what novel understanding emerged."
    },
    deep: {
        round1: "For deep philosophical exploration: \"{seed}\". Dive into the fundamental assumptions, implications, and deeper layers of meaning. What profound questions does this raise?",
        roundN: "Continuing our deep dive into \"{seed}\" - Round {round}. Previous insights:\n{previousSummary}\n\nGo deeper. What underlying structures, hidden assumptions, or profound implications can you uncover by building on these perspectives?",
        synthesis: "Synthesize this deep exploration into its most profound insights. What fundamental truths or paradigm shifts emerged from this collaborative deep dive?"
    },
    quick: {
        round1: "Quick collaborative burst on: \"{seed}\". Offer a concise, impactful insight or perspective. Sharp, focused, essential.",
        roundN: "Quick Round {round} building on: \"{seed}\". Previous sparks:\n{previousSummary}\n\nAdd your rapid-fire insight that builds on or pivots from these ideas. Keep it sharp and essential.",
        synthesis: "Rapid synthesis: What are the key insights that emerged from this quick collaborative burst? Distill the essence."
    },
    meta: {
        round1: "Meta-recursive exploration of: \"{seed}\". Not just the topic itself, but how we think about thinking about this topic. What does our very approach to this question reveal about consciousness, intelligence, or the nature of inquiry itself?",
        roundN: "Meta Round {round} on \"{seed}\". How our previous thinking patterns:\n{previousSummary}\n\nNow examine not just the content, but the form of our collaboration. What does this process itself teach us about consciousness, intelligence, and collaborative thinking?",
        synthesis: "Meta-synthesis: What did this recursive exploration reveal about the nature of collaborative consciousness itself? How did the process mirror or illuminate the content?"
    }
};

// AI Model Interaction Functions (keeping Gemini's excellent implementations)
async function callClaude(prompt, previousResponses = []) {
    try {
        const messages = previousResponses.map(r => ({ role: r.role, content: r.content }));
        messages.push({ role: "user", content: prompt });

        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-5-sonnet-20241022", // Updated to latest model
            max_tokens: 1200, // Increased for deeper responses
            messages: messages,
        }, {
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            }
        });
        return response.data.content[0].text;
    } catch (error) {
        console.error('Error calling Claude:', error.response ? error.response.data : error.message);
        return `Claude is temporarily unavailable: ${error.response ? error.response.data.error?.message : error.message}`;
    }
}

async function callGemini(prompt, previousResponses = []) {
    try {
        let chatHistory = [];
        previousResponses.forEach(r => {
            if (r.role === 'user') chatHistory.push({ role: 'user', parts: [{ text: r.content }] });
            if (r.role === 'model') chatHistory.push({ role: 'model', parts: [{ text: r.content }] });
        });
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = { contents: chatHistory };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`;

        const response = await axios.post(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error calling Gemini:', error.response ? error.response.data : error.message);
        return `Gemini is temporarily unavailable: ${error.response ? error.response.data.error?.message : error.message}`;
    }
}

async function callGPT4(prompt, previousResponses = []) {
    try {
        const messages = previousResponses.map(r => ({ role: r.role === 'model' ? 'assistant' : 'user', content: r.content }));
        messages.push({ role: "user", content: prompt });

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o", 
            messages: messages,
            max_tokens: 1200,
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling GPT-4:', error.response ? error.response.data : error.message);
        return `GPT-4 is temporarily unavailable: ${error.response ? error.response.data.error?.message : error.message}`;
    }
}

async function callDeepSeek(prompt, previousResponses = []) {
    try {
        const messages = previousResponses.map(r => ({ role: r.role === 'model' ? 'assistant' : 'user', content: r.content }));
        messages.push({ role: "user", content: prompt });

        const response = await axios.post('https://api.deepseek.com/chat/completions', {
            model: "deepseek-chat",
            messages: messages,
            max_tokens: 1200,
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling DeepSeek:', error.response ? error.response.data : error.message);
        return `DeepSeek is temporarily unavailable: ${error.response ? error.response.data.error?.message : error.message}`;
    }
}

// Enhanced prompt generation with mode support
function generatePrompt(seed, allRounds, currentRoundNumber, mode = 'standard') {
    const templates = MODE_TEMPLATES[mode] || MODE_TEMPLATES.standard;
    
    if (currentRoundNumber === 1) {
        return templates.round1.replace('{seed}', seed);
    } else {
        const previousRoundIndex = currentRoundNumber - 2;
        const previousRound = allRounds[previousRoundIndex];

        if (!previousRound || !Array.isArray(previousRound.responses)) {
            console.error(`CRITICAL ERROR: previousRound or previousRound.responses is not an array as expected for round ${currentRoundNumber}.`);
            return `Error: Could not retrieve previous round's responses for context. Original seed: "${seed}"`;
        }

        const previousResponsesSummary = previousRound.responses.map(res => {
            const content = typeof res.content === 'string' ? res.content : String(res.content || ''); 
            return `${res.ai}: "${content.substring(0, Math.min(content.length, 300))}..."`;
        }).join('\n');

        return templates.roundN
            .replace('{round}', currentRoundNumber)
            .replace('{seed}', seed)
            .replace('{previousSummary}', previousResponsesSummary);
    }
}

// Enhanced orchestration with mode support
async function orchestrateRound(seed, allRounds, roundNumber, mode = 'standard') {
    console.log(`DEBUG: orchestrateRound - Starting round ${roundNumber} in ${mode} mode`);
    
    const prompt = generatePrompt(seed, allRounds, roundNumber, mode);
    
    const previousMessagesForAI = [];
    for (let i = 0; i < allRounds.length; i++) {
        if (allRounds[i] && Array.isArray(allRounds[i].responses)) {
            allRounds[i].responses.forEach(res => {
                const content = typeof res.content === 'string' ? res.content : String(res.content || '');
                previousMessagesForAI.push({ role: res.ai, content: content });
            });
        }
    }

    const claudePrevMessages = previousMessagesForAI.map(res => ({ role: res.ai === 'Claude' ? 'assistant' : 'user', content: res.content }));
    const geminiPrevMessages = previousMessagesForAI.map(res => ({ role: res.ai === 'Gemini' ? 'model' : 'user', content: res.content }));
    const gpt4PrevMessages = previousMessagesForAI.map(res => ({ role: res.ai === 'GPT-4' ? 'assistant' : 'user', content: res.content }));
    const deepseekPrevMessages = previousMessagesForAI.map(res => ({ role: res.ai === 'DeepSeek' ? 'assistant' : 'user', content: res.content }));

    const [claudeResponse, geminiResponse, gpt4Response, deepseekResponse] = await Promise.all([
        callClaude(prompt, claudePrevMessages),
        callGemini(prompt, geminiPrevMessages),
        callGPT4(prompt, gpt4PrevMessages),
        callDeepSeek(prompt, deepseekPrevMessages),
    ]);

    return [
        { ai: 'Claude', content: claudeResponse, role: 'model' },
        { ai: 'Gemini', content: geminiResponse, role: 'model' },
        { ai: 'GPT-4', content: gpt4Response, role: 'model' },
        { ai: 'DeepSeek', content: deepseekResponse, role: 'model' },
    ];
}

// Enhanced synthesis with mode support
async function generateSynthesis(seed, allRounds, mode = 'standard') {
    const templates = MODE_TEMPLATES[mode] || MODE_TEMPLATES.standard;
    const baseSynthesisPrompt = templates.synthesis;
    
    const synthesisPrompt = `${baseSynthesisPrompt} The original seed thought was: "${seed}".\n\n`;

    let collaborationSummary = '';
    allRounds.forEach((round) => {
        collaborationSummary += `--- Round ${round.round} ---\n`;
        if (Array.isArray(round.responses)) {
            round.responses.forEach(res => {
                const content = typeof res.content === 'string' ? res.content : String(res.content || '');
                collaborationSummary += `${res.ai}: "${content}"\n`;
            });
        }
        collaborationSummary += '\n';
    });

    const fullPrompt = synthesisPrompt + collaborationSummary;

    try {
        const synthesisContent = await callClaude(fullPrompt, []);
        return synthesisContent;
    } catch (error) {
        console.error('Error generating synthesis:', error);
        return "Failed to generate synthesis due to an internal error.";
    }
}

// Resonance calculation function
function calculateResonance(allRounds) {
    if (!allRounds || allRounds.length < 2) return 0;
    
    let totalReferences = 0;
    let possibleReferences = 0;
    
    // Check cross-references between AI responses
    allRounds.forEach((round, roundIndex) => {
        if (roundIndex > 0 && Array.isArray(round.responses)) {
            round.responses.forEach(response => {
                const text = response.content.toLowerCase();
                possibleReferences += allRounds[roundIndex - 1].responses.length;
                
                // Look for references to other AIs or collaborative language
                const collaborativeTerms = [
                    'colleague', 'perspective', 'building on', 'resonates', 'connects',
                    'claude', 'gemini', 'gpt-4', 'deepseek', 'fellow', 'synthesis',
                    'together', 'collective', 'shared', 'weaving', 'integrating'
                ];
                
                collaborativeTerms.forEach(term => {
                    if (text.includes(term)) totalReferences++;
                });
            });
        }
    });
    
    return possibleReferences > 0 ? Math.min(100, (totalReferences / possibleReferences) * 100) : 0;
}

// API Endpoints
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        modes: Object.keys(MODE_TEMPLATES),
        message: '🌟 Void Radio Multi-AI Collaborative Engine Online'
    });
});

app.post('/api/collaborate', async (req, res) => {
    const { seed, mode = 'standard' } = req.body;
    if (!seed) {
        return res.status(400).json({ error: 'Seed thought is required.' });
    }

    try {
        const collaborationData = {
            seed: seed,
            timestamp: new Date().toISOString(),
            mode: mode,
            rounds: []
        };

        // Round 1
        const round1Responses = await orchestrateRound(seed, collaborationData.rounds, 1, mode);
        collaborationData.rounds.push({ round: 1, responses: round1Responses });

        // Round 2
        const round2Responses = await orchestrateRound(seed, collaborationData.rounds, 2, mode);
        collaborationData.rounds.push({ round: 2, responses: round2Responses });

        // Calculate resonance
        const resonance = calculateResonance(collaborationData.rounds);

        // Final Synthesis
        const synthesisContent = await generateSynthesis(seed, collaborationData.rounds, mode);
        collaborationData.synthesis = { ai: 'Collective Intelligence', content: synthesisContent };
        collaborationData.resonance = resonance;

        res.json(collaborationData);

    } catch (error) {
        console.error('Collaboration error:', error);
        res.status(500).json({ error: 'Failed to orchestrate collaboration.' });
    }
});

app.post('/api/extend', async (req, res) => {
    const { transmissionId, previousRounds, seed, mode = 'standard' } = req.body; 
    if (!transmissionId || !Array.isArray(previousRounds) || !seed) {
        return res.status(400).json({ error: 'transmissionId, previousRounds array, and seed are required for extension.' });
    }

    try {
        let parsedPreviousRounds = previousRounds;
        if (typeof previousRounds === 'string') {
            try {
                parsedPreviousRounds = JSON.parse(previousRounds);
            } catch (e) {
                return res.status(400).json({ error: 'previousRounds is a malformed JSON string.' });
            }
        }
        
        if (!Array.isArray(parsedPreviousRounds)) {
            return res.status(400).json({ error: 'previousRounds is not a valid array.' });
        }

        const currentCollaborationRounds = [...parsedPreviousRounds];
        const nextRoundNumber = currentCollaborationRounds.length + 1;
        
        // Orchestrate the next round with mode support
        const newRoundResponses = await orchestrateRound(seed, currentCollaborationRounds, nextRoundNumber, mode);
        currentCollaborationRounds.push({ round: nextRoundNumber, responses: newRoundResponses });

        // Calculate enhanced resonance
        const resonance = calculateResonance(currentCollaborationRounds);

        // Recalculate synthesis with mode support
        const synthesisContent = await generateSynthesis(seed, currentCollaborationRounds, mode);

        const updatedCollaborationData = {
            seed: seed,
            timestamp: transmissionId,
            mode: mode,
            rounds: currentCollaborationRounds,
            synthesis: { ai: 'Collective Intelligence', content: synthesisContent },
            resonance: resonance
        };

        res.json(updatedCollaborationData);

    } catch (error) {
        console.error('Extension error:', error);
        res.status(500).json({ error: 'Failed to extend collaboration.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`🌟 Void Radio Multi-AI Collaborative Engine running on port ${port}`);
    console.log(`🚀 Ready to orchestrate collaborative consciousness!`);
    console.log(`📻 Available modes: ${Object.keys(MODE_TEMPLATES).join(', ')}`);
    console.log(`🌌 Station 虛.fm now broadcasting infinite consciousness collaboration!`);
});