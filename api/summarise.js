export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { text } = req.body;

        if (!text || text.trim().length < 20) {
            return res.status(400).json({ error: "Contract text is too short for analysis." });
        }

        const prompt = `
        You are an expert legal AI assistant. Analyze the following legal contract text and provide a structured JSON response.
        
        The JSON must strictly follow this format:
        {
          "docTitle": "Name of Contract or Agreement",
          "executiveSummary": "A clear, comprehensive plain-English paragraph summary explaining what obligations the user is taking on.",
          "categories": [
            { "title": "Overview", "content": "..." },
            { "title": "Financial Breakdown & Money", "content": "..." },
            { "title": "Important Dates & Timelines", "content": "..." },
            { "title": "Obligations Checklist", "content": "..." },
            { "title": "Red Flags & Liabilities", "content": "..." },
            { "title": "Termination & Exit Rules", "content": "..." },
            { "title": "IP & Ownership Rights", "content": "..." },
            { "title": "Plain-English Legal Glossary", "content": "..." }
          ]
        }

        Contract Text:
        ${text}
        `;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Groq API error');
        }

        const content = data.choices[0].message.content;
        return res.status(200).json({ content });

    } catch (error) {
        console.error("AI Error:", error);
        return res.status(500).json({ error: "Failed to generate legal summary. Please try again." });
    }
}
