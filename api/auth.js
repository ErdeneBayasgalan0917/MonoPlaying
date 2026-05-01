export default async function handler(req, res) {
    // Enable CORS so your widget can talk to this API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { code, refresh_token, action } = req.body;
    
    // These come from Vercel Environment Variables
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI;

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const params = new URLSearchParams();
        if (action === 'auth') {
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('redirect_uri', redirectUri);
        } else {
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', refresh_token);
        }

        const response = await fetch('https://spotify.com', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
