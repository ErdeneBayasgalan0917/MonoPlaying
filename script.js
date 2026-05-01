// ============================================
// Spotify Now Playing Widget
// ============================================

// Configuration Management
class WidgetConfig {
    constructor() {
        this.defaults = {
            clientId: '',
            accessToken: localStorage.getItem('spotify_token') || '',
            showAlbumArt: true,
            showProgress: true,
            showTime: true,
            showTitle: true,
            showArtist: true,
            showEmoteSlot: true,
            primaryColor: '#1DB954',
            bgColor: '#000000',
            bgOpacity: 0.7,
            titleSize: 24,
            artistSize: 14,
            widgetWidth: 350,
            bgStyle: 'solid',
            animationSpeed: 'normal',
            borderRadius: 10,
            emoteUrl: '',
            emoteSize: 60,
        };
        this.load();
    }

    load() {
        const saved = localStorage.getItem('widget_config');
        if (saved) {
            this.config = { ...this.defaults, ...JSON.parse(saved) };
        } else {
            this.config = { ...this.defaults };
        }
    }

    save() {
        localStorage.setItem('widget_config', JSON.stringify(this.config));
    }

    get(key) {
        return this.config[key];
    }

    set(key, value) {
        this.config[key] = value;
        this.save();
    }

    export() {
        return JSON.stringify(this.config, null, 2);
    }

    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.config = { ...this.defaults, ...imported };
            this.save();
            return true;
        } catch (e) {
            return false;
        }
    }
}

// Spotify API Manager
class SpotifyManager {
    constructor(config) {
        this.config = config;
        this.clientId = config.get('clientId');
        this.accessToken = config.get('accessToken');
        this.refreshToken = localStorage.getItem('spotify_refresh_token') || '';
        this.tokenExpiry = localStorage.getItem('spotify_token_expiry') || 0;
        this.backendUrl = 'https://mono-now-playing-widget-obs.vercel.app/api/auth';
        this.redirectUri = window.location.origin + window.location.pathname;
        this.handleCallback();
    }

    // Spotify Authorization Flow (redirects to Spotify)
    authorize() {
        if (!this.clientId) {
            const id = prompt('Enter your Spotify Client ID:');
            if (id) {
                this.clientId = id;
                this.config.set('clientId', id);
            } else {
                showStatus('❌ Client ID required', 'error');
                return;
            }
        }

        const scope = 'user-read-currently-playing user-read-private';
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(scope)}&show_dialog=true`;
        window.location.href = authUrl;
    }

    // Handle OAuth callback after redirect from Spotify
    async handleCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error) {
            showStatus(`❌ Authorization failed: ${error}`, 'error');
            return;
        }

        if (code) {
            await this.exchangeCodeForToken(code);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Exchange authorization code for access token via backend
    async exchangeCodeForToken(code) {
        try {
            showStatus('🔄 Getting access token...', 'info');
            const response = await fetch(this.backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code, action: 'auth' })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const data = await response.json();
            this.setTokens(data.access_token, data.refresh_token, data.expires_in);
            showStatus('✅ Successfully authorized with Spotify!', 'success');
        } catch (error) {
            console.error('Token exchange error:', error);
            showStatus('❌ Failed to get access token. Try again.', 'error');
        }
    }

    // Store tokens and set expiry time
    setTokens(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    // Only update refresh token if a new one is provided
    if (refreshToken) {
        this.refreshToken = refreshToken;
        localStorage.setItem('spotify_refresh_token', refreshToken);
    }
    
    this.tokenExpiry = Date.now() + (expiresIn * 1000);
    this.config.set('accessToken', accessToken);
    localStorage.setItem('spotify_token_expiry', this.tokenExpiry);
    }


    // Check if token is expired and refresh if needed
    async refreshAccessToken() {
        if (!this.refreshToken) {
            return false;
        }

        if (Date.now() < this.tokenExpiry - 60000) {
            // Token still valid for at least 1 minute
            return true;
        }

        try {
            const response = await fetch(this.backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: this.refreshToken, action: 'refresh' })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            this.setTokens(data.access_token, data.refresh_token, data.expires_in);
            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            this.accessToken = '';
            this.refreshToken = '';
            return false;
        }
    }

    // Set access token manually (fallback)
    setAccessToken(token) {
        this.accessToken = token;
        this.config.set('accessToken', token);
        localStorage.setItem('spotify_token', token);
        showStatus('✅ Access Token saved!', 'success');
    }

    // Fetch currently playing track
    async getCurrentlyPlaying() {
        if (!this.accessToken) {
            showStatus('❌ No access token. Click "Authorize with Spotify" button.', 'error');
            return null;
        }

        // Refresh token if needed
        const tokenValid = await this.refreshAccessToken();
        if (!tokenValid) {
            showStatus('❌ Session expired. Please authorize again.', 'error');
            return null;
        }

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.status === 204) {
                return null; // No track playing
            }

            if (!response.ok) {
                if (response.status === 401) {
                    // Token might be invalid, try to refresh
                    await this.refreshAccessToken();
                    showStatus('❌ Token expired. Please authorize again.', 'error');
                }
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching currently playing:', error);
            return null;
        }
    }
}

// UI Manager
class UIManager {
    constructor(config) {
        this.config = config;
        this.setupEventListeners();
        this.applyConfig();
    }

    setupEventListeners() {
        // Config toggle
        document.getElementById('config-toggle').addEventListener('click', () => {
            document.getElementById('config-content').classList.toggle('hidden');
        });

        // Input listeners for configuration
        document.getElementById('clientId').addEventListener('change', (e) => {
            this.config.set('clientId', e.target.value);
        });

        document.getElementById('accessToken').addEventListener('change', (e) => {
            this.config.set('accessToken', e.target.value);
        });

        // Display options
        ['show-album-art', 'show-progress', 'show-time', 'show-title', 'show-artist', 'show-emote-slot'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.config.set(id.replace('show-', '').replace(/-/g, '_'), e.target.checked);
                this.updateVisibility();
            });
        });

        // Appearance customization
        document.getElementById('primary-color').addEventListener('change', (e) => {
            this.config.set('primaryColor', e.target.value);
            this.applyConfig();
        });

        document.getElementById('bg-color').addEventListener('change', (e) => {
            this.config.set('bgColor', e.target.value);
            this.applyConfig();
        });

        document.getElementById('bg-opacity').addEventListener('input', (e) => {
            this.config.set('bgOpacity', parseFloat(e.target.value));
            document.getElementById('opacity-value').textContent = Math.round(e.target.value * 100) + '%';
            this.applyConfig();
        });

        document.getElementById('title-size').addEventListener('input', (e) => {
            this.config.set('titleSize', parseInt(e.target.value));
            document.getElementById('title-size-value').textContent = e.target.value + 'px';
            this.applyConfig();
        });

        document.getElementById('artist-size').addEventListener('input', (e) => {
            this.config.set('artistSize', parseInt(e.target.value));
            document.getElementById('artist-size-value').textContent = e.target.value + 'px';
            this.applyConfig();
        });

        document.getElementById('widget-width').addEventListener('input', (e) => {
            this.config.set('widgetWidth', parseInt(e.target.value));
            document.getElementById('width-value').textContent = e.target.value + 'px';
            this.applyConfig();
        });

        document.getElementById('bg-style').addEventListener('change', (e) => {
            this.config.set('bgStyle', e.target.value);
            this.applyConfig();
        });

        document.getElementById('animation-speed').addEventListener('change', (e) => {
            this.config.set('animationSpeed', e.target.value);
            this.applyConfig();
        });

        document.getElementById('border-radius').addEventListener('input', (e) => {
            this.config.set('borderRadius', parseInt(e.target.value));
            document.getElementById('radius-value').textContent = e.target.value + 'px';
            this.applyConfig();
        });

        // Emote configuration
        document.getElementById('emote-url').addEventListener('change', (e) => {
            this.config.set('emoteUrl', e.target.value);
        });

        document.getElementById('emote-size').addEventListener('input', (e) => {
            this.config.set('emoteSize', parseInt(e.target.value));
            document.getElementById('emote-size-value').textContent = e.target.value + 'px';
            this.applyConfig();
        });

        // Buttons
        document.getElementById('auth-button').addEventListener('click', () => {
            spotifyManager.authorize();
        });

        document.getElementById('manual-paste-btn').addEventListener('click', () => {
            const token = prompt('Paste your Spotify Access Token:\n\n(Get from: https://developer.spotify.com/console/get-currently-playing/)\n\nTokens expire after ~1 hour.');
            if (token && token.trim()) {
                spotifyManager.setAccessToken(token.trim());
            }
        });

        document.getElementById('save-config').addEventListener('click', () => {
            this.config.save();
            showStatus('✅ Configuration saved!', 'success');
        });

        document.getElementById('export-config').addEventListener('click', () => {
            const json = this.config.export();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'widget-config.json';
            a.click();
            showStatus('📥 Configuration exported!', 'success');
        });

        document.getElementById('import-config').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (this.config.import(event.target.result)) {
                            this.updateAllControls();
                            this.applyConfig();
                            showStatus('📤 Configuration imported!', 'success');
                        } else {
                            showStatus('❌ Invalid configuration file', 'error');
                        }
                    };
                    reader.readAsText(file);
                }
            });
            input.click();
        });
    }

    applyConfig() {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', this.config.get('primaryColor'));
        root.style.setProperty('--bg-color', this.config.get('bgColor'));
        root.style.setProperty('--bg-opacity', this.config.get('bgOpacity'));
        root.style.setProperty('--title-size', this.config.get('titleSize') + 'px');
        root.style.setProperty('--artist-size', this.config.get('artistSize') + 'px');
        root.style.setProperty('--widget-width', this.config.get('widgetWidth') + 'px');
        root.style.setProperty('--border-radius', this.config.get('borderRadius') + 'px');
        root.style.setProperty('--emote-size', this.config.get('emoteSize') + 'px');

        const animSpeed = this.config.get('animationSpeed');
        document.getElementById('now-playing').className = `now-playing animation-${animSpeed}`;

        const bgStyle = this.config.get('bgStyle');
        document.getElementById('now-playing').classList.remove('bg-blur', 'bg-transparent', 'bg-gradient');
        if (bgStyle === 'blur') {
            document.getElementById('now-playing').classList.add('bg-blur');
        } else if (bgStyle === 'transparent') {
            document.getElementById('now-playing').classList.add('bg-transparent');
        } else if (bgStyle === 'gradient') {
            document.getElementById('now-playing').classList.add('bg-gradient');
        }

        this.updateVisibility();
    }

    updateVisibility() {
        document.getElementById('album-art-container').classList.toggle(
            'hidden',
            !this.config.get('album_art')
        );
        document.getElementById('progress-container').classList.toggle(
            'hidden',
            !this.config.get('progress')
        );
        document.getElementById('emote-slot').classList.toggle(
            'hidden',
            !this.config.get('emote_slot')
        );

        if (!this.config.get('title')) {
            document.getElementById('track-name').style.display = 'none';
        } else {
            document.getElementById('track-name').style.display = 'block';
        }

        if (!this.config.get('artist')) {
            document.getElementById('track-artist').style.display = 'none';
        } else {
            document.getElementById('track-artist').style.display = 'block';
        }
    }

    updateAllControls() {
        document.getElementById('clientId').value = this.config.get('clientId');
        document.getElementById('accessToken').value = this.config.get('accessToken');
        document.getElementById('show-album-art').checked = this.config.get('album_art');
        document.getElementById('show-progress').checked = this.config.get('progress');
        document.getElementById('show-time').checked = this.config.get('time');
        document.getElementById('show-title').checked = this.config.get('title');
        document.getElementById('show-artist').checked = this.config.get('artist');
        document.getElementById('show-emote-slot').checked = this.config.get('emote_slot');
        document.getElementById('primary-color').value = this.config.get('primaryColor');
        document.getElementById('bg-color').value = this.config.get('bgColor');
        document.getElementById('bg-opacity').value = this.config.get('bgOpacity');
        document.getElementById('opacity-value').textContent = Math.round(this.config.get('bgOpacity') * 100) + '%';
        document.getElementById('title-size').value = this.config.get('titleSize');
        document.getElementById('title-size-value').textContent = this.config.get('titleSize') + 'px';
        document.getElementById('artist-size').value = this.config.get('artistSize');
        document.getElementById('artist-size-value').textContent = this.config.get('artistSize') + 'px';
        document.getElementById('widget-width').value = this.config.get('widgetWidth');
        document.getElementById('width-value').textContent = this.config.get('widgetWidth') + 'px';
        document.getElementById('bg-style').value = this.config.get('bgStyle');
        document.getElementById('animation-speed').value = this.config.get('animationSpeed');
        document.getElementById('border-radius').value = this.config.get('borderRadius');
        document.getElementById('radius-value').textContent = this.config.get('borderRadius') + 'px';
        document.getElementById('emote-url').value = this.config.get('emoteUrl');
        document.getElementById('emote-size').value = this.config.get('emoteSize');
        document.getElementById('emote-size-value').textContent = this.config.get('emoteSize') + 'px';
    }

    displayTrack(track) {
        const container = document.getElementById('now-playing');
        const albumArt = document.getElementById('album-art');
        const trackName = document.getElementById('track-name');
        const trackArtist = document.getElementById('track-artist');
        const spotifyLink = document.getElementById('spotify-link');
        const progressBar = document.getElementById('progress-bar');
        const currentTimeEl = document.getElementById('current-time');
        const totalTimeEl = document.getElementById('total-time');
        const emoteImg = document.getElementById('emote-img');

        if (track && track.item) {
            const item = track.item;
            const images = item.album?.images || [];
            const albumArtUrl = images.length > 0 ? images[0].url : '';

            albumArt.src = albumArtUrl;
            trackName.textContent = item.name;
            trackArtist.textContent = item.artists.map(a => a.name).join(', ');
            spotifyLink.href = item.external_urls?.spotify || '#';

            // Update progress
            if (track.progress_ms !== null && track.item.duration_ms) {
                const progress = (track.progress_ms / track.item.duration_ms) * 100;
                progressBar.style.width = progress + '%';
                currentTimeEl.textContent = this.formatTime(track.progress_ms);
                totalTimeEl.textContent = this.formatTime(track.item.duration_ms);
            }

            // Set emote if configured
            const emoteUrl = this.config.get('emoteUrl');
            if (emoteUrl) {
                emoteImg.src = emoteUrl;
            }

            container.classList.remove('hidden');
        } else {
            trackName.textContent = 'Not Playing';
            trackArtist.textContent = 'Spotify';
            albumArt.src = '';
            container.classList.add('hidden');
        }
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
}

// Global functions
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.classList.add('show');
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 3000);
}

// Initialize
let config;
let spotifyManager;
let uiManager;

document.addEventListener('DOMContentLoaded', async () => {
    config = new WidgetConfig();
    spotifyManager = new SpotifyManager(config);
    uiManager = new UIManager(config);

    // Update UI controls with saved values
    uiManager.updateAllControls();

    // Fetch track immediately
    let trackData = await spotifyManager.getCurrentlyPlaying();
    uiManager.displayTrack(trackData);

    // Update every second for progress bar, every 5 seconds for track change
    let progressCounter = 0;
    setInterval(async () => {
        progressCounter++;

        if (progressCounter >= 5) {
            // Full update
            trackData = await spotifyManager.getCurrentlyPlaying();
            uiManager.displayTrack(trackData);
            progressCounter = 0;
        } else if (trackData && trackData.item && trackData.progress_ms !== null) {
            // Just update progress bar
            const progress = (trackData.progress_ms / trackData.item.duration_ms) * 100;
            document.getElementById('progress-bar').style.width = progress + '%';
            document.getElementById('current-time').textContent = uiManager.formatTime(trackData.progress_ms);

            // Simulate progress increment
            trackData.progress_ms += 1000;
        }
    }, 1000);

    showStatus('✅ Widget ready! Configure in Settings.', 'success');
});
