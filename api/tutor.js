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

    // Ensure request is POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { contents, systemInstruction } = req.body;

    // 2. Fetch API key safely from Vercel Environment Variables
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY missing on Vercel.' });
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
        
        // Pass Google's exact status code if it failed
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to communicate with AI server.' });
    }
}
