import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { text } = req.body;

        if (!text || text.trim().length < 20) {
            return res.status(400).json({ error: "Contract text is too short for analysis." });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        return res.status(200).json({ content: response.text });

    } catch (error) {
        console.error("AI Error:", error);
        return res.status(500).json({ error: "Failed to generate legal summary. Please try again." });
    }
}
