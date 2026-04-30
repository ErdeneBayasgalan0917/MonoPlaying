# Spotify Now Playing Widget for OBS

A fully customizable Spotify now playing widget for Twitch streamers. Displays current track, album art, progress bar, and more!

## ⚡ Quick Setup (3 Steps)

### 1. Deploy Backend to Vercel (Free)

The widget uses a secure backend to handle Spotify authentication. You'll deploy it to Vercel in seconds.

**Steps:**
1. Create a Vercel account: https://vercel.com (free)
2. Click **"New Project"** → **"Import Git Repository"**
3. Select your MonoPlaying repository from GitHub
4. In **Environment Variables**, add:
   - `SPOTIFY_CLIENT_ID` = Your Client ID (from Spotify Dashboard)
   - `SPOTIFY_CLIENT_SECRET` = Your Client Secret (from Spotify Dashboard)
   - `REDIRECT_URI` = `https://erdenebaygalan0917.github.io/MonoPlaying/`
5. Click **Deploy**

After deploy, you'll get a URL like: `https://monoplaying-abc123.vercel.app`

### 2. Update Widget Backend URL

1. Open `script.js`
2. Find this line (~line 13):
   ```javascript
   this.backendUrl = 'https://monoplaying.vercel.app/api/auth';
   ```
3. Replace with your Vercel URL:
   ```javascript
   this.backendUrl = 'https://your-vercel-url.vercel.app/api/auth';
   ```
4. Push to GitHub:
   ```powershell
   git add .
   git commit -m "Update backend URL"
   git push
   ```

### 3. Get Spotify Credentials

1. Go to: https://developer.spotify.com/dashboard
2. Create an app (if you haven't)
3. In app settings:
   - Copy **Client ID**
   - Copy **Client Secret** (keep this private!)
   - Add Redirect URI: `https://erdenebaygalan0917.github.io/MonoPlaying/`

## 🎮 Using the Widget

### In OBS:
1. Add **Browser Source**
2. URL: `https://erdenebaygalan0917.github.io/MonoPlaying/`
3. Width: 400px, Height: 150px (adjust as needed)
4. Check "Local file" if running locally

### First Time Setup:
1. Open the widget page
2. Click **⚙️ Settings**
3. Enter your **Client ID**
4. Click **🔐 Authorize with Spotify**
5. Login to Spotify (one-time only!)
6. Done! Token auto-refreshes

## 🎨 Customization

Everything is customizable via the **⚙️ Settings** panel:

- **Display**: Show/hide song title, artist, album art, progress, time, emote slot, Spotify link
- **Colors**: Primary color, background color, opacity
- **Size**: Widget width, font sizes, border radius
- **Background**: Solid, blur, transparent, or gradient
- **Animations**: Speed effects for smoother transitions
- **Emote Slot**: Add a GIF or image that displays alongside the track

All settings auto-save in browser storage and can be exported/imported as JSON!

## 🔒 Security Notes

- **Client Secret** is stored ONLY on Vercel backend (never sent to frontend)
- **Access Tokens** are refreshed automatically (expire after 1 hour)
- **Refresh Tokens** stored in browser (used to get new access tokens)
- No personal data is sent anywhere except Spotify API

## 🚀 Advanced: Local Development

To run locally with live reload:

```powershell
# Install Python (if you don't have it)
# Then run a local server:
python -m http.server 8000

# Or with Node.js:
npx http-server
```

Visit: `http://localhost:8000`

Note: You'll need to add `http://localhost:8000` as a redirect URI in Spotify Dashboard for local testing.

## 🛠️ Troubleshooting

**"Widget shows 'Not Playing'"**
- Check your internet connection
- Verify access token is valid
- Make sure Spotify is actively playing

**"Authorization failed"**
- Check that Spotify Client ID is correct
- Verify redirect URI matches exactly in Spotify Dashboard
- Clear browser cache and try again

**"Backend returning 401 errors"**
- Verify `SPOTIFY_CLIENT_SECRET` is set correctly in Vercel
- Check that your Vercel environment variables are deployed
- Try redeploying: `vercel deploy --prod`

**"Token keeps expiring"**
- This is normal! The widget auto-refreshes
- If manual refresh fails, click "Authorize with Spotify" again

## 📦 Deployment Checklist

- [ ] Backend deployed to Vercel with environment variables set
- [ ] `script.js` updated with correct Vercel URL
- [ ] GitHub Pages enabled on repository
- [ ] Spotify app has correct redirect URI
- [ ] Repository pushed (`git push`)
- [ ] GitHub Pages showing widget at your URL

## 📝 File Structure

```
MonoPlaying/
├── index.html          # Main widget UI
├── style.css           # All styling & animations
├── script.js           # Widget logic & Spotify API
├── api/
│   └── auth.js         # Backend authentication handler
├── vercel.json         # Vercel deployment config
└── README.md           # This file
```

## 🤝 Support

For Spotify API issues: https://developer.spotify.com/documentation/web-api/
For Vercel deployment: https://vercel.com/docs

---

**Made for streamers. Free. Open source. 100% customizable.**
