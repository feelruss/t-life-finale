export default async function handler(req, res) {
  // 1. Enable CORS Headers for frontend connection handshake
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // 2. Safe parsing extraction with default fallbacks
  const { mode = 'Balance', recentActivities = [], stressLevel = 5 } = req.body || {};

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured in environment variables.' });
  }

  const activitiesList = Array.isArray(recentActivities) ? recentActivities.join(', ') : 'None';

  const prompt = `
    You are an AI assistant for university students. 
    The student is currently in "${mode}" mode (Focus or Balance).
    Their self-reported stress level is: ${stressLevel}/10.
    Recent activities: ${activitiesList}.
    
    Based on this, return a JSON object ONLY with the following structure:
    {
      "focusScore": (integer between 0 and 100),
      "balanceScore": (integer between 0 and 100),
      "recommendation": "A short 2-sentence piece of personalized advice"
    }
    Ensure the response is raw JSON only. Do not wrap in markdown tags.
  `;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0, // <-- Locked to 0.0 to eliminate value fluctuations
        seed: 42,         // <-- Deterministic seed to guarantee consistency 
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch from Groq');
    }

    let rawContent = data.choices[0].message.content.trim();
    
    // Clean out markdown wrappers if mistakenly generated
    if (rawContent.startsWith('```')) {
      rawContent = rawContent.replace(/^```json/, '').replace(/```$/, '').trim();
    }

    const result = JSON.parse(rawContent);
    return res.status(200).json(result);

  } catch (error) {
    console.error('AI Meter Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}