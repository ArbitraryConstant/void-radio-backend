// Enhanced server.js with real-time progress tracking and streaming
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
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Progress tracking system
class ProgressTracker {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.progress = {
            overall: 0,
            currentStep: 'initializing',
            steps: {
                initialize: { status: 'pending', progress: 0, message: 'Preparing collaborative session...' },
                aiProcessing: { status: 'pending', progress: 0, message: 'Awakening AI minds...' },
                synthesis: { status: 'pending', progress: 0, message: 'Synthesizing collective insights...' },
                complete: { status: 'pending', progress: 0, message: 'Transmission complete!' }
            },
            aiStates: {
                claude: { status: 'waiting', progress: 0, startTime: null, responseTime: null },
                gemini: { status: 'waiting', progress: 0, startTime: null, responseTime: null },
                gpt4: { status: 'waiting', progress: 0, startTime: null, responseTime: null },
                deepseek: { status: 'waiting', progress: 0, startTime: null, responseTime: null }
            },
            startTime: Date.now(),
            estimatedCompletion: null
        };
        this.subscribers = new Set();
    }

    updateStep(stepName, status, progress = 0, message = null) {
        if (this.progress.steps[stepName]) {
            this.progress.steps[stepName].status = status;
            this.progress.steps[stepName].progress = progress;
            if (message) this.progress.steps[stepName].message = message;
            this.progress.currentStep = stepName;
            this.calculateOverallProgress();
            this.notifySubscribers();
        }
    }

    updateAI(aiName, status, progress = 0, responseTime = null) {
        if (this.progress.aiStates[aiName]) {
            const aiState = this.progress.aiStates[aiName];
            aiState.status = status;
            aiState.progress = progress;
            
            if (status === 'thinking' && !aiState.startTime) {
                aiState.startTime = Date.now();
            }
            
            if (status === 'complete' && responseTime) {
                aiState.responseTime = responseTime;
            }
            
            this.calculateOverallProgress();
            this.notifySubscribers();
        }
    }

    calculateOverallProgress() {
        const stepWeights = {
            initialize: 10,
            aiProcessing: 70,
            synthesis: 15,
            complete: 5
        };

        let totalProgress = 0;
        Object.entries(this.progress.steps).forEach(([stepName, step]) => {
            const weight = stepWeights[stepName] || 0;
            const stepProgress = step.status === 'complete' ? 100 : 
                               step.status === 'active' ? step.progress : 0;
            totalProgress += (stepProgress * weight) / 100;
        });

        this.progress.overall = Math.min(Math.round(totalProgress), 100);
        
        // Update estimated completion
        if (this.progress.overall > 0) {
            const elapsed = Date.now() - this.progress.startTime;
            const estimatedTotal = (elapsed / this.progress.overall) * 100;
            this.progress.estimatedCompletion = this.progress.startTime + estimatedTotal;
        }
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.progress);
            } catch (error) {
                console.error('Error notifying progress subscriber:', error);
            }
        });
    }

    complete() {
        this.updateStep('complete', 'complete', 100, 'Transmission complete!');
        this.progress.overall = 100;
        this.notifySubscribers();
    }
}

// Store active progress trackers
const progressTrackers = new Map();

// Enhanced AI calling functions with progress tracking
async function callClaudeWithProgress(prompt, previousResponses = [], progressTracker) {
    const aiName = 'claude';
    progressTracker.updateAI(aiName, 'thinking', 0);
    
    try {
        const startTime = Date.now();
        const messages = previousResponses.map(r => ({ 
            role: r.role === 'model' ? 'assistant' : 'user', 
            content: r.content 
        }));
        messages.push({ role: "user", content: prompt });

        // Simulate progress during API call
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / 8000) * 100, 95); // Assume ~8 seconds max
            progressTracker.updateAI(aiName, 'thinking', progress);
        }, 200);

        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1200,
            messages: messages,
        }, {
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        clearInterval(progressInterval);
        const responseTime = Date.now() - startTime;
        progressTracker.updateAI(aiName, 'complete', 100, responseTime);
        
        return response.data.content[0].text;
    } catch (error) {
        progressTracker.updateAI(aiName, 'error', 0);
        console.error('Error calling Claude:', error.response ? error.response.data : error.message);
        return `Claude encountered an error: ${error.response ? error.response.data.error?.message : error.message}`;
    }
}

async function callGeminiWithProgress(prompt, previousResponses = [], progressTracker) {
    const aiName = 'gemini';
    progressTracker.updateAI(aiName, 'thinking', 0);
    
    try {
        const startTime = Date.now();
        
        // Simulate progress during API call
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / 6000) * 100, 95); // Assume ~6 seconds max
            progressTracker.updateAI(aiName, 'thinking', progress);
        }, 200);

        let chatHistory = [];
        previousResponses.forEach(r => {
            if (r.role === 'user') chatHistory.push({ role: 'user', parts: [{ text: r.content }] });
            if (r.role === 'model') chatHistory.push({ role: 'model', parts: [{ text: r.content }] });
        });
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = { contents: chatHistory };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`;

        const response = await axios.post(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        clearInterval(progressInterval);
        const responseTime = Date.now() - startTime;
        progressTracker.updateAI(aiName, 'complete', 100, responseTime);
        
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        progressTracker.updateAI(aiName, 'error', 0);
        console.error('Error calling Gemini:', error.response ? error.response.data : error.message);
        return `Gemini encountered an error: ${error.response ? error.response.data.error?.message : error.message}`;
    }
}

async function callGPT4WithProgress(prompt, previousResponses = [], progressTracker) {
    const aiName = 'gpt4';
    progressTracker.updateAI(aiName, 'thinking', 0);
    
    try {
        const startTime = Date.now();
        
        // Simulate progress during API call
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / 10000) * 100, 95); // Assume ~10 seconds max
            progressTracker.updateAI(aiName, 'thinking', progress);
        }, 200);

        const messages = previousResponses.map(r => ({ 
            role: r.role === 'model' ? 'assistant' : 'user', 
            content: r.content 
        }));
        messages.push({ role: "user", content: prompt });

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o",
            messages: messages,
            max_tokens: 1200,
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        clearInterval(progressInterval);
        const responseTime = Date.now() - startTime;
        progressTracker.updateAI(aiName, 'complete', 100, responseTime);
        
        return response.data.choices[0].message.content;
    } catch (error) {
        progressTracker.updateAI(aiName, 'error', 0);
        console.error('Error calling GPT-4:', error.response ? error.response.data : error.message);
        return `GPT-4 encountered an error: ${error.response ? error.response.data.error?.message : error.message}`;
    }
}

async function callDeepSeekWithProgress(prompt, previousResponses = [], progressTracker) {
    const aiName = 'deepseek';
    progressTracker.updateAI(aiName, 'thinking', 0);
    
    try {
        const startTime = Date.now();
        
        // Simulate progress during API call
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / 7000) * 100, 95); // Assume ~7 seconds max
            progressTracker.updateAI(aiName, 'thinking', progress);
        }, 200);

        const messages = previousResponses.map(r => ({ 
            role: r.role === 'model' ? 'assistant' : 'user', 
            content: r.content 
        }));
        messages.push({ role: "user", content: prompt });

        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: "deepseek-chat",
            messages: messages,
            max_tokens: 1200,
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        clearInterval(progressInterval);
        const responseTime = Date.now() - startTime;
        progressTracker.updateAI(aiName, 'complete', 100, responseTime);
        
        return response.data.choices[0].message.content;
    } catch (error) {
        progressTracker.updateAI(aiName, 'error', 0);
        console.error('Error calling DeepSeek:', error.response ? error.response.data : error.message);
        return `DeepSeek encountered an error: ${error.response ? error.response.data.error?.message : error.message}`;
    }
}

// Mode templates (keeping your existing ones)
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

// Enhanced orchestration with progress tracking
async function orchestrateRoundWithProgress(seed, allRounds, roundNumber, mode, progressTracker) {
    progressTracker.updateStep('aiProcessing', 'active', 0, 'Awakening AI minds...');
    
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

    // Call AIs in parallel with progress tracking
    const aiCalls = [];
    
    if (ANTHROPIC_API_KEY) {
        const claudePrevMessages = previousMessagesForAI.map(res => ({ 
            role: res.ai === 'Claude' ? 'assistant' : 'user', 
            content: res.content 
        }));
        aiCalls.push(callClaudeWithProgress(prompt, claudePrevMessages, progressTracker));
    }
    
    if (GOOGLE_API_KEY) {
        const geminiPrevMessages = previousMessagesForAI.map(res => ({ 
            role: res.ai === 'Gemini' ? 'model' : 'user', 
            content: res.content 
        }));
        aiCalls.push(callGeminiWithProgress(prompt, geminiPrevMessages, progressTracker));
    }
    
    if (OPENAI_API_KEY) {
        const gpt4PrevMessages = previousMessagesForAI.map(res => ({ 
            role: res.ai === 'GPT-4' ? 'assistant' : 'user', 
            content: res.content 
        }));
        aiCalls.push(callGPT4WithProgress(prompt, gpt4PrevMessages, progressTracker));
    }
    
    if (DEEPSEEK_API_KEY) {
        const deepseekPrevMessages = previousMessagesForAI.map(res => ({ 
            role: res.ai === 'DeepSeek' ? 'assistant' : 'user', 
            content: res.content 
        }));
        aiCalls.push(callDeepSeekWithProgress(prompt, deepseekPrevMessages, progressTracker));
    }

    const responses = await Promise.all(aiCalls);
    
    const aiResponses = [];
    let responseIndex = 0;
    
    if (ANTHROPIC_API_KEY) aiResponses.push({ ai: 'Claude', content: responses[responseIndex++], role: 'model' });
    if (GOOGLE_API_KEY) aiResponses.push({ ai: 'Gemini', content: responses[responseIndex++], role: 'model' });
    if (OPENAI_API_KEY) aiResponses.push({ ai: 'GPT-4', content: responses[responseIndex++], role: 'model' });
    if (DEEPSEEK_API_KEY) aiResponses.push({ ai: 'DeepSeek', content: responses[responseIndex++], role: 'model' });

    progressTracker.updateStep('aiProcessing', 'complete', 100, 'AI responses complete!');
    
    return aiResponses;
}

// Helper functions (keeping existing ones)
function generatePrompt(seed, allRounds, currentRoundNumber, mode = 'standard') {
    const templates = MODE_TEMPLATES[mode] || MODE_TEMPLATES.standard;
    
    if (currentRoundNumber === 1) {
        return templates.round1.replace('{seed}', seed);
    } else {
        const previousRoundIndex = currentRoundNumber - 2;
        const previousRound = allRounds[previousRoundIndex];

        if (!previousRound || !Array.isArray(previousRound.responses)) {
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

async function generateSynthesisWithProgress(seed, allRounds, mode, progressTracker) {
    progressTracker.updateStep('synthesis', 'active', 0, 'Synthesizing collective insights...');
    
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
        // Use Gemini for synthesis if available, otherwise use first available AI
        let synthesisContent;
        if (GOOGLE_API_KEY) {
            synthesisContent = await callGeminiWithProgress(fullPrompt, [], progressTracker);
        } else if (ANTHROPIC_API_KEY) {
            synthesisContent = await callClaudeWithProgress(fullPrompt, [], progressTracker);
        } else {
            synthesisContent = "No AI available for synthesis.";
        }
        
        progressTracker.updateStep('synthesis', 'complete', 100, 'Synthesis complete!');
        return synthesisContent;
    } catch (error) {
        console.error('Error generating synthesis:', error);
        progressTracker.updateStep('synthesis', 'error', 0, 'Synthesis failed');
        return "Failed to generate synthesis due to an internal error.";
    }
}

function calculateResonance(allRounds) {
    if (!allRounds || allRounds.length < 2) return 0;
    
    let totalReferences = 0;
    let possibleReferences = 0;
    
    allRounds.forEach((round, roundIndex) => {
        if (roundIndex > 0 && Array.isArray(round.responses)) {
            round.responses.forEach(response => {
                const text = response.content.toLowerCase();
                possibleReferences += allRounds[roundIndex - 1].responses.length;
                
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
    const availableAIs = [];
    if (ANTHROPIC_API_KEY) availableAIs.push('Claude');
    if (GOOGLE_API_KEY) availableAIs.push('Gemini');
    if (OPENAI_API_KEY) availableAIs.push('GPT-4');
    if (DEEPSEEK_API_KEY) availableAIs.push('DeepSeek');
    
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        modes: Object.keys(MODE_TEMPLATES),
        availableAIs: availableAIs,
        message: '🌟 Void Radio Multi-AI Collaborative Engine Online with Progress Tracking'
    });
});

// Progress tracking endpoint
app.get('/api/progress/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const tracker = progressTrackers.get(sessionId);
    
    if (!tracker) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(tracker.progress);
});

// Server-Sent Events for real-time progress
app.get('/api/progress/:sessionId/stream', (req, res) => {
    const { sessionId } = req.params;
    const tracker = progressTrackers.get(sessionId);
    
    if (!tracker) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    // Send initial progress
    res.write(`data: ${JSON.stringify(tracker.progress)}\n\n`);
    
    // Subscribe to updates
    const unsubscribe = tracker.subscribe((progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });
    
    // Clean up on client disconnect
    req.on('close', () => {
        unsubscribe();
    });
});

app.post('/api/collaborate', async (req, res) => {
    const { seed, mode = 'standard' } = req.body;
    if (!seed) {
        return res.status(400).json({ error: 'Seed thought is required.' });
    }

    const sessionId = Date.now().toString();
    const progressTracker = new ProgressTracker(sessionId);
    progressTrackers.set(sessionId, progressTracker);

    try {
        progressTracker.updateStep('initialize', 'active', 50, 'Preparing collaborative session...');
        
        const collaborationData = {
            sessionId: sessionId,
            seed: seed,
            timestamp: new Date().toISOString(),
            mode: mode,
            rounds: []
        };

        progressTracker.updateStep('initialize', 'complete', 100, 'Session initialized!');

        // Round 1
        const round1Responses = await orchestrateRoundWithProgress(seed, collaborationData.rounds, 1, mode, progressTracker);
        collaborationData.rounds.push({ round: 1, responses: round1Responses });

        // Round 2
        const round2Responses = await orchestrateRoundWithProgress(seed, collaborationData.rounds, 2, mode, progressTracker);
        collaborationData.rounds.push({ round: 2, responses: round2Responses });

        // Calculate resonance
        const resonance = calculateResonance(collaborationData.rounds);

        // Final Synthesis
        const synthesisContent = await generateSynthesisWithProgress(seed, collaborationData.rounds, mode, progressTracker);
        collaborationData.synthesis = { ai: 'Collective Intelligence', content: synthesisContent };
        collaborationData.resonance = resonance;

        progressTracker.complete();

        // Clean up tracker after 5 minutes
        setTimeout(() => {
            progressTrackers.delete(sessionId);
        }, 300000);

        res.json(collaborationData);

    } catch (error) {
        console.error('Collaboration error:', error);
        progressTracker.updateStep('error', 'error', 0, 'Collaboration failed');
        res.status(500).json({ error: 'Failed to orchestrate collaboration.' });
    }
});

app.post('/api/extend', async (req, res) => {
    const { transmissionId, previousRounds, seed, mode = 'standard' } = req.body; 
    if (!transmissionId || !Array.isArray(previousRounds) || !seed) {
        return res.status(400).json({ error: 'transmissionId, previousRounds array, and seed are required for extension.' });
    }

    const sessionId = `${transmissionId}-extend-${Date.now()}`;
    const progressTracker = new ProgressTracker(sessionId);
    progressTrackers.set(sessionId, progressTracker);

    try {
        progressTracker.updateStep('initialize', 'active', 50, 'Preparing extension...');
        
        const currentCollaborationRounds = [...previousRounds];
        const nextRoundNumber = currentCollaborationRounds.length + 1;
        
        progressTracker.updateStep('initialize', 'complete', 100, 'Extension initialized!');
        
        const newRoundResponses = await orchestrateRoundWithProgress(seed, currentCollaborationRounds, nextRoundNumber, mode, progressTracker);
        currentCollaborationRounds.push({ round: nextRoundNumber, responses: newRoundResponses });

        const resonance = calculateResonance(currentCollaborationRounds);
        const synthesisContent = await generateSynthesisWithProgress(seed, currentCollaborationRounds, mode, progressTracker);

        const updatedCollaborationData = {
            sessionId: sessionId,
            seed: seed,
            timestamp: transmissionId,
            mode: mode,
            rounds: currentCollaborationRounds,
            synthesis: { ai: 'Collective Intelligence', content: synthesisContent },
            resonance: resonance
        };

        progressTracker.complete();

        // Clean up tracker after 5 minutes
        setTimeout(() => {
            progressTrackers.delete(sessionId);
        }, 300000);

        res.json(updatedCollaborationData);

    } catch (error) {
        console.error('Extension error:', error);
        progressTracker.updateStep('error', 'error', 0, 'Extension failed');
        res.status(500).json({ error: 'Failed to extend collaboration.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`🌟 Void Radio Multi-AI Collaborative Engine running on port ${port}`);
    console.log(`🚀 Ready to orchestrate collaborative consciousness with real-time progress tracking!`);
    console.log(`📻 Available modes: ${Object.keys(MODE_TEMPLATES).join(', ')}`);
    console.log(`🌌 Station 虛.fm now broadcasting with live progress updates!`);
});
