const fs = require('fs');
const path = require('path');
const { getStore } = require('@netlify/blobs');

const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../../shelton-ai-knowledge-base.md');
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_QUESTION_LENGTH = 400;
const MAX_TOKENS = 400;
const DAILY_LIMIT_PER_IP = 20;

let cachedSystemPrompt = null;
function getSystemPrompt() {
  if (!cachedSystemPrompt) {
    cachedSystemPrompt = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf8');
  }
  return cachedSystemPrompt;
}

function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers['x-nf-client-connection-ip'] ||
    (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

async function checkAndIncrementRateLimit(ip) {
  const store = getStore('shelton-ai-rate-limits');
  const today = new Date().toISOString().slice(0, 10);
  const key = `${today}:${ip}`;

  const current = (await store.get(key, { type: 'json' })) || { count: 0 };
  if (current.count >= DAILY_LIMIT_PER_IP) {
    return false;
  }

  current.count += 1;
  await store.setJSON(key, current, { metadata: { ttl: 60 * 60 * 24 * 2 } });
  return true;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let question;
  try {
    const body = JSON.parse(event.body || '{}');
    question = typeof body.question === 'string' ? body.question.trim() : '';
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!question) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Question is required' }) };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer` }),
    };
  }

  const ip = getClientIp(event);
  try {
    const allowed = await checkAndIncrementRateLimit(ip);
    if (!allowed) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: "That's enough questions for today — try again tomorrow." }),
      };
    }
  } catch (err) {
    // If the rate limiter itself fails, fail open rather than breaking the widget.
    console.error('Rate limit check failed', err);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server is not configured' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: getSystemPrompt(),
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error', response.status, errText);
      return { statusCode: 502, body: JSON.stringify({ error: 'Upstream model request failed' }) };
    }

    const data = await response.json();
    const answer = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answer }),
    };
  } catch (err) {
    console.error('Unexpected error calling Anthropic API', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong' }) };
  }
};
