require('dotenv').config();
const fetch = require('node-fetch');

const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(prompt) {
  // If key missing, return a safe canned response (helpful for local dev)
  if (!OPENAI_KEY) {
    console.warn('OPENAI_API_KEY not set — returning canned response');
    if (prompt.toLowerCase().includes('reserve')) {
      // sample: instruct LLM to output action when asked
      return '{"action":"reserve_book","bookId":"B001","title":"Programming in C"}';
    }
    return 'Sample reply: This is a demo response because OPENAI_API_KEY is not configured.';
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // replace with available model you have access to
      messages: [
        { role: 'system', content: process.env.SYSTEM_PROMPT || '' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.2
    })
  });

  const j = await res.json();
  if (!j.choices || !j.choices[0]) throw new Error('OpenAI error: ' + JSON.stringify(j));
  return j.choices[0].message.content;
}

module.exports = { callOpenAI };
