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

    // List of models to try in order of preference
    const fallbackModels = [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite"
    ];

    const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, systemInstruction })
    };

    let lastError = null;

    // Try each model sequentially until one succeeds
    for (const model of fallbackModels) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEY}`;
            const response = await fetch(url, fetchOptions);
            const data = await response.json();

            // If request succeeded, return the payload immediately
            if (response.ok && !data.error) {
                return res.status(200).json(data);
            }

            // If error is 503 (server overloaded) or 429 (rate limited), loop to try the next fallback model
            if (data.error && (data.error.code === 503 || data.error.code === 429)) {
                console.warn(`Model ${model} busy (${data.error.code}). Trying fallback model...`);
                lastError = data.error;
                continue;
            }

            // If it's a non-capacity error (e.g. invalid key/schema), return it directly
            return res.status(200).json({
                candidates: [{ content: { parts: [{ text: `Google API Error (${data.error.code}): ${data.error.message}` }] } }]
            });

        } catch (err) {
            console.error(`Fetch exception on model ${model}:`, err);
            lastError = err;
        }
    }

    // If all models failed due to capacity issues
    return res.status(200).json({
        candidates: [{ content: { parts: [{ text: `Google AI Servers are currently under heavy load across all models (${lastError?.code || '503'}). Please try again in a moment.` }] } }]
    });
}
