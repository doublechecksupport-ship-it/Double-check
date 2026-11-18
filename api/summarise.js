import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }

    const token = authHeader.split(' ')[1];

    // Initialize Supabase server client to verify the auth token
    const supabase = createClient(
      process.env.SUPABASE_URL || 'https://jacksheaslenrvmdbfvsjfqdgx.supabase.co',
      process.env.SUPABASE_ANON_KEY || 'sb_publishable_t3ivgTlGaqQK2T6WhXKB3Q_WvMZW0zr'
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized session' });
    }

    const { text } = req.body;
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide valid contract text to summarize.' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ error: 'Groq API key not configured on server environment variables.' });
    }

    // Call Groq API (OpenAI-compatible endpoint)
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert legal AI assistant. Analyze the provided legal text and return a JSON object with two fields: "title" (a concise professional title for the agreement) and "executiveSummary" (a clear, plain-English summary outlining key obligations, risks, and terms). Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    });

    if (!aiResponse.ok) {
      const errData = await aiResponse.text();
      console.error('AI API Error:', errData);
      throw new Error('Failed to generate summary from AI model.');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      parsed = {
        title: "Legal Contract Summary",
        executiveSummary: content || "Summary generated successfully."
      };
    }

    return res.status(200).json({ parsed });

  } catch (err) {
    console.error('Summarise API Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
