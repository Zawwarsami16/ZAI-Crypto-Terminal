const APP_TITLE = 'Anteroom Crypto Terminal';

const PROVIDERS = {
  openrouter: {
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openai/gpt-4o-mini',
  },
  openai: {
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4.1-mini',
  },
  anthropic: {
    label: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-haiku-latest',
  },
  groq: {
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
  },
  gemini: {
    label: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
  },
};

export function detectAiProvider(apiKey = '') {
  const key = apiKey.trim();
  if (/^sk-or-/i.test(key)) return 'openrouter';
  if (/^sk-ant-/i.test(key)) return 'anthropic';
  if (/^gsk_/i.test(key)) return 'groq';
  if (/^AIza/i.test(key)) return 'gemini';
  if (/^sk-/i.test(key)) return 'openai';
  return 'openrouter';
}

function toAnthropicPayload(messages) {
  const system = messages
    .filter(message => message.role === 'system')
    .map(message => message.content)
    .join('\n\n');

  const conversation = messages
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content || ''),
    }));

  return {
    model: PROVIDERS.anthropic.model,
    system: system || undefined,
    messages: conversation.length ? conversation : [{ role: 'user', content: 'Analyze the current market context.' }],
    temperature: 0.2,
    max_tokens: 350,
  };
}

function toGeminiPayload(messages) {
  const systemText = messages
    .filter(message => message.role === 'system')
    .map(message => message.content)
    .join('\n\n');

  const contents = messages
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(message.content || '') }],
    }));

  return {
    systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
    contents: contents.length ? contents : [{ role: 'user', parts: [{ text: 'Analyze the current market context.' }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 350,
    },
  };
}

async function parseError(res, provider) {
  let detail = '';
  try {
    const err = await res.json();
    detail = err?.error?.message || err?.message || err?.error?.status || '';
  } catch {}

  return detail
    ? `${PROVIDERS[provider].label} request failed: ${res.status} - ${detail}`
    : `${PROVIDERS[provider].label} request failed: ${res.status}`;
}

function extractText(data, provider) {
  if (provider === 'anthropic') {
    return data?.content?.map(part => part?.text || '').join('').trim();
  }

  if (provider === 'gemini') {
    return data?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('').trim();
  }

  return data?.choices?.[0]?.message?.content?.trim();
}

export async function callAI(apiKey, messages, provider = detectAiProvider(apiKey)) {
  const key = apiKey.trim();
  const selectedProvider = PROVIDERS[provider] ? provider : detectAiProvider(key);
  const config = PROVIDERS[selectedProvider];

  let url = config.endpoint;
  let headers = { 'Content-Type': 'application/json' };
  let body;

  if (selectedProvider === 'anthropic') {
    headers = {
      ...headers,
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    body = toAnthropicPayload(messages);
  } else if (selectedProvider === 'gemini') {
    url = `${config.endpoint}?key=${encodeURIComponent(key)}`;
    body = toGeminiPayload(messages);
  } else {
    headers = {
      ...headers,
      Authorization: `Bearer ${key}`,
    };

    if (selectedProvider === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = APP_TITLE;
      headers['X-OpenRouter-Title'] = APP_TITLE;
    }

    body = {
      model: config.model,
      messages,
      temperature: 0.2,
      max_tokens: 350,
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await parseError(res, selectedProvider));

  const data = await res.json();
  return extractText(data, selectedProvider) || 'No response returned.';
}

export async function callOpenRouter(apiKey, messages) {
  return callAI(apiKey, messages);
}
