// api/tutor.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { contents, systemInstruction } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(200).json({ 
            candidates: [{ content: { parts: [{ text: "Backend Error: GEMINI_API_KEY environment variable is missing on Vercel." }] } }] 
        });
    }

    try {
        // 1. Ask Google directly which models are available for this key
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const listData = await listResponse.json();

        if (listData.error) {
            return res.status(200).json({
                candidates: [{ content: { parts: [{ text: `Google Auth Error (${listData.error.code}): ${listData.error.message}` }] } }]
            });
        }

        // 2. Find the first model that supports generateContent (preferring flash)
        const availableModels = listData.models || [];
        const supportedModelObj = availableModels.find(m => 
            m.supportedGenerationMethods && 
            m.supportedGenerationMethods.includes("generateContent") &&
            m.name.includes("flash")
        ) || availableModels.find(m => 
            m.supportedGenerationMethods && 
            m.supportedGenerationMethods.includes("generateContent")
        );

        if (!supportedModelObj) {
            return res.status(200).json({
                candidates: [{ content: { parts: [{ text: "No available models support generateContent for this API key." }] } }]
            });
        }

        // Extract the full model path (e.g. models/gemini-1.5-flash)
        const activeModelName = supportedModelObj.name;

        // 3. Call generateContent using the verified model name returned by Google
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${activeModelName}:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents, systemInstruction })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(200).json({
                candidates: [{ content: { parts: [{ text: `Google API Error (${data.error.code}): ${data.error.message}` }] } }]
            });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(200).json({
            candidates: [{ content: { parts: [{ text: `Server Exception: ${error.message}` }] } }]
        });
    }
}
