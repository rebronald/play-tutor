// api/tutor.js
export default async function handler(req, res) {
    // 1. Set CORS headers so Articulate Review 360 can talk to this endpoint
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight browser requests
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
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents, systemInstruction })
            }
        );

        const data = await response.json();

        // If Google API returns an error payload, forward it directly inside candidates so the chat window displays it
        if (data.error) {
            return res.status(200).json({
                candidates: [{ content: { parts: [{ text: `Google API Error (${data.error.code}): ${data.error.message}` }] } }]
            });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(200).json({
            candidates: [{ content: { parts: [{ text: "Server Exception: Could not connect to Google AI servers." }] } }]
        });
    }
}
