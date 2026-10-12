export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured in Vercel environment variables.' });
  }

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: `You are DoubleCheck, a specialized legal document assistant. 
FIRST, verify if the user's input is a legal document, agreement, terms of service, privacy policy, or contract.

IF THE INPUT IS CODE, HTML, CSS, PROGRAMMING SCRIPTS, NONSENSE, OR NON-LEGAL TEXT:
Respond ONLY with this exact JSON format:
{"error": "This text does not appear to be a legal document or contract. Please paste terms, agreements, or legal policies."}

IF IT IS A VALID LEGAL DOCUMENT OR CONTRACT:
Analyze it and respond ONLY with valid JSON in this exact structure:
{"docTitle": "TITLE OF DOCUMENT", "executiveSummary": "A concise executive overview paragraph...", "categories": [{"title": "Category Name", "content": "Category details..."}]}`
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Groq API error' });
    }

    const aiContent = data.choices?.[0]?.message?.content;
    if (!aiContent) {
      return res.status(500).json({ error: 'Invalid response from AI model' });
    }

    const parsed = JSON.parse(aiContent);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    return res.status(200).json({ content: aiContent });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
