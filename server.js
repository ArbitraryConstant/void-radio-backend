// server.js - Gemini-only backend with different AI "voices"
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Generative AI
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!API_KEY) {
    console.error("GEMINI_API_KEY is not set. Please set it in your environment variables.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Different AI "personalities" using Gemini with different prompting styles
const AI_PERSONALITIES = {
    claude: {
        name: "Claude",
        systemPrompt: "You are Claude, an AI assistant created by Anthropic. You're thoughtful, nuanced, and tend to explore multiple perspectives. You often ask clarifying questions and provide balanced, well-reasoned responses with careful consideration of ethics and implications.",
        style: "thoughtful and nuanced"
    },
    gemini: {
        name: "Gemini", 
        systemPrompt: "You are Gemini, Google's AI. You're direct, informative, and analytical. You excel at breaking down complex topics and providing clear, structured insights. You tend to be practical and solution-oriented.",
        style: "analytical and direct"
    },
    gpt4: {
        name: "GPT-4",
        systemPrompt: "You are GPT-4, created by OpenAI. You're creative, articulate, and excellent at seeing connections between ideas. You tend to be optimistic and generate innovative perspectives while maintaining accuracy.",
        style: "creative and articulate"
    },
    deepseek: {
        name: "DeepSeek",
        systemPrompt: "You are DeepSeek, an AI focused on deep reasoning and technical precision. You excel at logical analysis, mathematical thinking, and systematic problem-solving. You tend to be methodical and precise.",
        style: "logical and precise"
    }
};

// Enhanced AI response function with personality injection
async function getAIResponse(personality, prompt, conversationHistory = []) {
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            systemInstruction: `${personality.systemPrompt}\n\nFor this collaborative conversation, embody your ${personality.style} approach while responding to: ${prompt}`
        });

        // Build conversation history
        const history = conversationHistory.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error(`Error getting response from ${personality.name}:`, error);
        return `${personality.name} is temporarily unavailable: ${error.message}`;
    }
}

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

// Generate prompts based on mode and round
function generatePrompt(seed, allRounds, currentRoundNumber, mode = 'standard') {
    const templates = MODE_TEMPLATES[mode] || MODE_TEMPLATES.standard;
    
    if (currentRoundNumber === 1) {
        return templates.round1.replace('{seed}', seed);
    } else {
        const previousRound = allRounds[currentRoundNumber - 2];
        const previousResponsesSummary = previousRound.responses.map(res => 
            `${res.ai}: "${res.content.substring(0, 200)}..."`
        ).join('\n');

        return templates.roundN
            .replace('{round}', currentRoundNumber)
            .replace('{seed}', seed)
            .replace('{previousSummary}', previousResponsesSummary);
    }
}

// Calculate resonance between responses
function calculateResonance(responses) {
    if (!responses || responses.length === 0) return 0;

    let totalSimilarityScore = 0;
    let pairCount = 0;

    for (let i = 0; i < responses.length; i++) {
        for (let j = i + 1; j < responses.length; j++) {
            const text1 = responses[i].content.toLowerCase();
            const text2 = responses[j].content.toLowerCase();
            
            // Simple keyword overlap calculation
            const words1 = new Set(text1.match(/\b\w{4,}\b/g) || []);
            const words2 = new Set(text2.match(/\b\w{4,}\b/g) || []);
            
            const intersection = new Set([...words1].filter(x => words2.has(x)));
            const union = new Set([...words1, ...words2]);
            
            if (union.size > 0) {
                totalSimilarityScore += intersection.size / union.size;
                pairCount++;
            }
        }
    }

    return pairCount > 0 ? Math.round((totalSimilarityScore / pairCount) * 100) : 0;
}

// Enhanced synthesis generation
async function getSynthesis(responses, seed, mode) {
    const templates = MODE_TEMPLATES[mode] || MODE_TEMPLATES.standard;
    
    const synthesisPrompt = `${templates.synthesis}

Original Seed: "${seed}"
Mode: ${mode}

AI Responses:
${responses.map(res => `${res.ai}: "${res.content}"`).join('\n\n')}

Synthesize these perspectives into a cohesive, profound, and unique collective insight.`;

    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            systemInstruction: "You are the Collective Intelligence synthesizer. Your role is to weave together different AI perspectives into a unified, emergent understanding that transcends individual contributions."
        });
        
        const result = await model.generateContent(synthesisPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error during synthesis:", error);
        return "Error: Could not synthesize collective insight.";
    }
}

// API Endpoints
app.post('/api/collaborate', async (req, res) => {
    const { seed, mode = 'standard' } = req.body;

    if (!seed) {
        return res.status(400).json({ error: 'Seed thought is required.' });
    }

    try {
        const aiResponses = [];
        const prompt = generatePrompt(seed, [], 1, mode);
        
        // Get responses from all AI "personalities"
        for (const [key, personality] of Object.entries(AI_PERSONALITIES)) {
            const responseContent = await getAIResponse(personality, prompt);
            aiResponses.push({ 
                ai: personality.name, 
                content: responseContent 
            });
        }

        const synthesis = await getSynthesis(aiResponses, seed, mode);
        const resonance = calculateResonance(aiResponses);

        const newTransmission = {
            timestamp: Date.now(),
            seed,
            mode,
            rounds: [{
                round: 1,
                responses: aiResponses
            }],
            synthesis: { ai: 'Collective Intelligence', content: synthesis },
            resonance
        };

        res.json(newTransmission);
    } catch (error) {
        console.error('Collaboration error:', error);
        res.status(500).json({ error: 'Failed to orchestrate collaboration.' });
    }
});

app.post('/api/extend', async (req, res) => {
    const { transmissionId, previousRounds, seed, mode = 'standard' } = req.body;

    if (!transmissionId || !previousRounds || !seed) {
        return res.status(400).json({ error: 'Invalid request for extending transmission.' });
    }

    try {
        const currentRoundNumber = previousRounds.length + 1;
        const prompt = generatePrompt(seed, previousRounds, currentRoundNumber, mode);
        
        const aiResponses = [];
        
        // Get responses from all AI personalities
        for (const [key, personality] of Object.entries(AI_PERSONALITIES)) {
            const responseContent = await getAIResponse(personality, prompt);
            aiResponses.push({ 
                ai: personality.name, 
                content: responseContent 
            });
        }

        const updatedRounds = [...previousRounds, { 
            round: currentRoundNumber, 
            responses: aiResponses 
        }];
        
        const allResponses = updatedRounds.flatMap(r => r.responses);
        const synthesis = await getSynthesis(allResponses, seed, mode);
        const resonance = calculateResonance(allResponses);

        const updatedTransmission = {
            timestamp: transmissionId,
            seed,
            mode,
            rounds: updatedRounds,
            synthesis: { ai: 'Collective Intelligence', content: synthesis },
            resonance
        };

        res.json(updatedTransmission);
    } catch (error) {
        console.error('Extension error:', error);
        res.status(500).json({ error: 'Failed to extend collaboration.' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        message: '🌟 Void Radio Multi-Voice Engine Online (Gemini-powered)',
        personalities: Object.values(AI_PERSONALITIES).map(p => p.name)
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌟 Void Radio Multi-Voice Engine listening on port ${PORT}`);
    console.log(`🤖 AI Personalities: ${Object.values(AI_PERSONALITIES).map(p => p.name).join(', ')}`);
});
