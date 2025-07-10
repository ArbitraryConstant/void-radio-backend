// test.js - Simple test script for API connectivity
require('dotenv').config();
const axios = require('axios');

async function testAPIs() {
  const testPrompt = "Hello, AI! Are you online?";

  console.log('--- Testing API Connectivity ---');

  // Test Claude
  try {
    const claudeUrl = 'https://api.anthropic.com/v1/messages';
    const claudeHeaders = {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    };
    const claudeResponse = await axios.post(claudeUrl, {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 50,
      messages: [{ role: 'user', content: testPrompt }]
    }, { headers: claudeHeaders });
    if (claudeResponse.data.content && claudeResponse.data.content.length > 0) {
      console.log('✅ Claude: Claude online');
    } else {
      console.log('❌ Claude: Unexpected response from Claude');
    }
  } catch (error) {
    console.error('❌ Claude: Failed to connect to Claude. Check API key and network.');
    console.error('   Error:', error.response?.data || error.message);
  }

  // Test Gemini
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`;
    const geminiHeaders = { 'Content-Type': 'application/json' };
    const geminiResponse = await axios.post(geminiUrl, {
      contents: [{ parts: [{ text: testPrompt }] }]
    }, { headers: geminiHeaders });
    if (geminiResponse.data.candidates && geminiResponse.data.candidates.length > 0) {
      console.log('✅ Gemini: Gemini online');
    } else {
      console.log('❌ Gemini: Unexpected response from Gemini');
    }
  } catch (error) {
    console.error('❌ Gemini: Failed to connect to Gemini. Check API key and network.');
    console.error('   Error:', error.response?.data || error.message);
  }

  // Test GPT-4 (OpenAI)
  try {
    const openaiUrl = 'https://api.openai.com/v1/chat/completions';
    const openaiHeaders = {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    };
    const openaiResponse = await axios.post(openaiUrl, {
      model: 'gpt-4',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 50
    }, { headers: openaiHeaders });
    if (openaiResponse.data.choices && openaiResponse.data.choices.length > 0) {
      console.log('✅ GPT-4: GPT-4 online');
    } else {
      console.log('❌ GPT-4: Unexpected response from GPT-4');
    }
  } catch (error) {
    console.error('❌ GPT-4: Failed to connect to GPT-4. Check API key and network.');
    console.error('   Error:', error.response?.data || error.message);
  }

  // Test DeepSeek
  try {
    const deepseekUrl = 'https://api.deepseek.com/v1/chat/completions';
    const deepseekHeaders = {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    };
    const deepseekResponse = await axios.post(deepseekUrl, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 50
    }, { headers: deepseekHeaders });
    if (deepseekResponse.data.choices && deepseekResponse.data.choices.length > 0) {
      console.log('✅ DeepSeek: DeepSeek online');
    } else {
      console.log('❌ DeepSeek: Unexpected response from DeepSeek');
    }
  } catch (error) {
    console.error('❌ DeepSeek: Failed to connect to DeepSeek. Check API key and network.');
    console.error('   Error:', error.response?.data || error.message);
  }

  console.log('\n--- API Test Complete ---');
}

if (require.main === module) {
  testAPIs();
}

module.exports = testAPIs; // Export for potential future use in other scripts