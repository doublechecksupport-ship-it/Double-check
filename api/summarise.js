export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, userEmail, userPlan } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured in environment variables.' });
  }

  if (!text || text.trim().length < 20) {
    return res.status(400).json({ error: 'Document text is too short or missing.' });
  }

  try {
    const isBasePlan = userPlan === 'base';
    const boxInstructions = isBasePlan 
      ? `Provide the executive summary paragraph and return 4 Core Boxes: Executive Summary, Financial Breakdown & Money, Important Dates & Timelines, and Obligations Checklist.`
      : `Provide the executive summary paragraph and return all 8 Breakdown Boxes: Executive Summary, Financial Breakdown & Money, Important Dates & Timelines, Obligations Checklist, Red Flags & Liabilities, Termination & Exit Rules, IP & Ownership Rights, and Plain-English Legal Glossary.`;

    const systemInstruction = `You are Double Check, a legal document assistant. 
FIRST, verify if the input text is a valid legal document, agreement, terms, or contract.
IF IT IS NOT LEGAL TEXT OR IS CODE/NONSENSE:
Respond ONLY with this JSON: {"error": "Invalid Input: Please paste or upload a legal agreement or contract."}

IF IT IS VALID LEGAL TEXT:
Analyze the document and return ONLY valid JSON in this exact structure:
{
  "docTitle": "TITLE OF DOCUMENT",
  "executiveSummary": "Clear plain-language paragraph summary...",
  "categories": [
    {"title": "Executive Summary", "content": "Overview content..."},
    {"title": "Financial Breakdown & Money", "content": "Costs, payment schedules, fees..."},
    {"title": "Important Dates & Timelines", "content": "Deadlines, renewal dates..."},
    {"title": "Obligations Checklist", "content": "Required duties for each party..."},
    {"title": "Red Flags & Liabilities", "content": "Unusual penalties, harsh terms, liabilities..."},
    {"title": "Termination & Exit Rules", "content": "Cancellation rules and notice periods..."},
    {"title": "IP & Ownership Rights", "content": "Intellectual property ownership..."},
    {"title": "Plain-English Legal Glossary", "content": "Key terms defined simply..."}
  ]
}
Note: ${boxInstructions}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: text }
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
