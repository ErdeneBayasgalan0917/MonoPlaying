// Vercel Serverless Function for Spotify OAuth
// Deploy to Vercel: https://vercel.com

const https = require('https');
const querystring = require('querystring');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://erdenebaygalan0917.github.io/MonoPlaying/';

// Helper: Make HTTPS request to Spotify API
async function spotifyRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

// Exchange authorization code for access token
async function exchangeCode(code) {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const body = querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
    });

    const options = {
        hostname: 'accounts.spotify.com',
        path: '/api/token',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    return spotifyRequest(options, body);
}

// Refresh access token using refresh token
async function refreshToken(refresh_token) {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const body = querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
    });

    const options = {
        hostname: 'accounts.spotify.com',
        path: '/api/token',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    return spotifyRequest(options, body);
}

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://erdenebaygalan0917.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { code, refresh_token, action } = req.body;

        // Exchange authorization code for tokens
        if (code || action === 'auth') {
            if (!code) {
                return res.status(400).json({ error: 'No authorization code provided' });
            }

            const { status, data } = await exchangeCode(code);

            if (status !== 200) {
                return res.status(status).json(data);
            }

            return res.status(200).json({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in || 3600
            });
        }

        // Refresh access token
        if (refresh_token || action === 'refresh') {
            if (!refresh_token) {
                return res.status(400).json({ error: 'No refresh token provided' });
            }

            const { status, data } = await refreshToken(refresh_token);

            if (status !== 200) {
                return res.status(status).json(data);
            }

            return res.status(200).json({
                access_token: data.access_token,
                refresh_token: data.refresh_token || refresh_token,
                expires_in: data.expires_in || 3600
            });
        }

        res.status(400).json({ error: 'Invalid request' });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: error.message });
    }
};
