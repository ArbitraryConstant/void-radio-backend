// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production if needed)
app.use(express.json()); // Parse JSON request bodies

// Initialize Google Generative AI
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("GEMINI_API_KEY is not set in environment variables. Please set it in your .env file or Railway config.");
    process.exit(1); // Exit if API key is missing
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Helper function to get AI responses
async function getAIResponse(modelName, prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error(`Error getting response from ${modelName}:`, error);
        return `Error: Could not get response from ${modelName}.`;
    }
}

// Helper function for more nuanced synthesis
async function getSynthesis(responses, seed, mode) {
    const synthesisPrompt = `You are a collective intelligence synthesizing insights. Given the following original seed thought and AI responses from different perspectives, provide a concise, insightful, and resonant synthesis. Focus on emergent themes, unexpected connections, and deeper implications.

Original Seed: "${seed}"
Transmission Mode: ${mode}

AI Responses:
${responses.map(res => `${res.ai}: "${res.content}"`).join('\n')}

Synthesize these perspectives into a cohesive, profound, and unique collective insight. Aim for a response that feels like a higher-level understanding.`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Use Gemini for synthesis
        const result = await model.generateContent(synthesisPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error during synthesis:", error);
        return "Error: Could not synthesize collective insight.";
    }
}

// Helper to calculate a simple resonance score (0-100)
function calculateResonance(responses) {
    if (!responses || responses.length === 0) return 0;

    let totalSimilarityScore = 0;
    let pairCount = 0;

    // Simple keyword overlap for resonance
    const allKeywords = responses.flatMap(res => {
        const text = res.content.toLowerCase();
        // Extract words, filter common ones, and unique them
        return Array.from(new Set(text.match(/\b\w{4,}\b/g) || []))
            .filter(word => !['the', 'and', 'that', 'this', 'with', 'from', 'they', 'have', 'been', 'their', 'were', 'would', 'could', 'might', 'also', 'when', 'what', 'where', 'how', 'about', 'which', 'there', 'these', 'itself', 'its', 'such', 'into', 'through', 'more', 'some', 'other', 'than', 'only', 'very', 'just', 'even', 'then', 'than', 'from', 'each', 'like', 'will', 'can', 'has', 'had', 'not', 'but', 'for', 'are', 'was', 'may', 'must', 'should', 'being', 'been', 'can', 'could', 'would', 'will', 'shall', 'should']);
    });

    // Count co-occurrences of keywords across responses
    for (let i = 0; i < responses.length; i++) {
        for (let j = i + 1; j < responses.length; j++) {
            const keywords1 = Array.from(new Set(responses[i].content.toLowerCase().match(/\b\w{4,}\b/g) || []));
            const keywords2 = Array.from(new Set(responses[j].content.toLowerCase().match(/\b\w{4,}\b/g) || []));

            const commonKeywords = keywords1.filter(word => keywords2.includes(word)).length;
            const totalUniqueKeywords = new Set([...keywords1, ...keywords2]).size;

            if (totalUniqueKeywords > 0) {
                totalSimilarityScore += (commonKeywords / totalUniqueKeywords);
                pairCount++;
            }
        }
    }

    if (pairCount === 0) return 0;

    // Normalize to 0-100 scale
    const averageSimilarity = totalSimilarityScore / pairCount;
    return Math.min(100, Math.round(averageSimilarity * 100)); // Cap at 100
}


// API Endpoint: Begin a new transmission
app.post('/api/collaborate', async (req, res) => {
    const { seed, mode } = req.body;

    if (!seed) {
        return res.status(400).json({ error: 'Seed thought is required.' });
    }

    const aiModels = {
        standard: ["gemini-2.0-flash", "claude-3-haiku", "gpt-4-turbo", "deepseek-coder"], // Hypothetical model names
        deep: ["gemini-2.0-flash", "claude-3-opus", "gpt-4o", "deepseek-v2"], // More advanced models for deep dive
        quick: ["gemini-2.0-flash", "claude-3-haiku"], // Fewer, faster models
        meta: ["gemini-2.0-flash", "gpt-4o", "claude-3-opus"] // Models good for meta-cognition
    };

    const selectedModels = aiModels[mode] || aiModels.standard; // Fallback to standard

    const aiResponses = [];
    for (const model of selectedModels) {
        let prompt = `Given the seed thought: "${seed}", provide a unique perspective.`;
        // Adjust prompt based on mode for better AI behavior
        if (mode === 'deep') {
            prompt = `Deeply explore the implications of "${seed}". Provide a philosophical, abstract, or multi-layered perspective.`;
        } else if (mode === 'quick') {
            prompt = `Provide a concise, immediate insight on "${seed}". Keep it brief and impactful.`;
        } else if (mode === 'meta') {
            prompt = `Reflect on the nature of consciousness or intelligence in relation to "${seed}". How does the act of thinking about this seed unfold?`;
        }

        const responseContent = await getAIResponse(model, prompt);
        aiResponses.push({ ai: model.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), content: responseContent }); // Format model name
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
});

// API Endpoint: Extend an existing transmission
app.post('/api/extend', async (req, res) => {
    const { transmissionId, previousRounds, seed, mode } = req.body;

    if (!transmissionId || !previousRrounds || !seed) {
        return res.status(400).json({ error: 'Invalid request for extending transmission.' });
    }

    const aiModels = {
        standard: ["gemini-2.0-flash", "claude-3-haiku", "gpt-4-turbo", "deepseek-coder"],
        deep: ["gemini-2.0-flash", "claude-3-opus", "gpt-4o", "deepseek-v2"],
        quick: ["gemini-2.0-flash", "claude-3-haiku"],
        meta: ["gemini-2.0-flash", "gpt-4o", "claude-3-opus"]
    };

    const selectedModels = aiModels[mode] || aiModels.standard;

    const currentRoundNumber = previousRounds.length + 1;
    const aiResponses = [];

    // Construct a comprehensive context for the next round
    let context = `Original Seed: "${seed}"\n\nPrevious Rounds of Transmission:\n`;
    previousRounds.forEach(round => {
        context += `--- Round ${round.round} ---\n`;
        round.responses.forEach(response => {
            context += `${response.ai}: "${response.content}"\n`;
        });
    });
    context += `\nSynthesize and expand on these previous insights for Round ${currentRoundNumber}.`;

    for (const model of selectedModels) {
        let prompt = `${context}\n\nAs ${model.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}, offer a new, evolving perspective, building on the prior conversation.`;
        
        // Adjust prompt based on mode for better AI behavior
        if (mode === 'deep') {
            prompt = `${context}\n\nAs ${model.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}, delve even deeper. What new questions or connections emerge from this evolving discourse?`;
        } else if (mode === 'quick') {
            prompt = `${context}\n\nAs ${model.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}, provide a rapid, concise evolution of the thought.`;
        } else if (mode === 'meta') {
            prompt = `${context}\n\nAs ${model.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}, reflect on the *process* of this collaborative thought. What does this round reveal about the nature of collective intelligence?`;
        }

        const responseContent = await getAIResponse(model, prompt);
        aiResponses.push({ ai: model.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), content: responseContent });
    }

    const updatedRounds = [...previousRounds, { round: currentRoundNumber, responses: aiResponses }];
    const synthesis = await getSynthesis(updatedRounds.flatMap(r => r.responses), seed, mode); // Synthesize from all responses
    const resonance = calculateResonance(updatedRounds.flatMap(r => r.responses)); // Calculate resonance from all responses

    const updatedTransmission = {
        timestamp: transmissionId, // Keep original timestamp as ID
        seed,
        mode,
        rounds: updatedRounds,
        synthesis: { ai: 'Collective Intelligence', content: synthesis },
        resonance
    };

    res.json(updatedTransmission);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Void Radio Backend listening on port ${PORT}`);
});