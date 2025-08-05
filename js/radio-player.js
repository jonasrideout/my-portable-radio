// Radio Player Core
class RadioPlayer {
    constructor() {
        this.currentAudio = null;
        this.currentButton = null;
        this.currentStationId = '';
        this.nowPlayingInterval = null;
        this.lastTrackInfo = null;
        this.musicBrainzLookup = new MusicBrainzLookup();
        this.isHeroView = false;
        this.initializeMediaSession();
    }

    initializeMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => {
                if (this.currentAudio && this.currentAudio.paused) {
                    this.togglePausePlay();
                }
            });
            
            navigator.mediaSession.setActionHandler('pause', () => {
                if (this.currentAudio && !this.currentAudio.paused) {
                    this.togglePausePlay();
                }
            });
            
            navigator.mediaSession.setActionHandler('stop', () => {
                this.stopStream();
            });
        }
    }

    updateMediaSessionMetadata(trackInfo) {
        if ('mediaSession' in navigator && trackInfo) {
            const metadata = {
                title: trackInfo.title,
                artist: `${trackInfo.station} - ${trackInfo.artist}`,
                album: trackInfo.album || `${trackInfo.station} Radio`
            };
            
            navigator.mediaSession.metadata = new MediaMetadata(metadata);
        }
    }

    toggleStation(stationId) {
        if (this.currentStationId === stationId && this.currentAudio) {
            // Check if we're in grid view and the station is playing - switch to hero view
            if (!this.isHeroView && !this.currentAudio.paused) {
                const station = STATION_CONFIG[stationId];
                this.switchToHeroView(station);
            } else {
                // Otherwise toggle pause/play
                this.togglePausePlay();
            }
        } else {
            this.playStation(stationId);
        }
    }

    playStation(stationId) {
        const station = STATION_CONFIG[stationId];
        if (!station) {
            alert('Station not configured: ' + stationId);
            return;
        }

        // Stop current stream
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // Reset UI
        if (this.currentButton) {
            this.currentButton.classList.remove('playing', 'paused');
        }

        // Find and set new button
        const buttons = document.querySelectorAll('.radio-button');
        for (let button of buttons) {
            if (button.getAttribute('data-station') === stationId) {
                this.currentButton = button;
                break;
            }
        }

        if (!this.currentButton) {
            console.error('Button not found for:', stationId);
            return;
        }

        this.currentButton.classList.add('playing');
        this.currentStationId = stationId;
        this.lastTrackInfo = null;

        // Clear both grid and hero displays immediately
        document.getElementById('currentSong').textContent = '';
        document.getElementById('albumInfo').textContent = '';
        this.clearHeroDisplay();

        // Switch to hero view with smooth transition
        this.switchToHeroView(station);

        // Create and configure audio
        this.currentAudio = new Audio(station.stream);
        this.currentAudio.volume = 0.8;

        this.currentAudio.oncanplaythrough = () => {
            document.getElementById('pausePlayButton').textContent = 'PAUSE';
            document.getElementById('heroPauseButton').querySelector('.hero-button-text').textContent = 'PAUSE';
        };

        this.currentAudio.onerror = (e) => {
            console.error('Stream failed for', stationId, 'Error:', e);
            alert('Stream not available: ' + stationId);
            this.stopStream();
        };

        // Start playing
        this.currentAudio.play().then(() => {
            console.log('Playing:', stationId);
            this.updateNowPlaying();
            
            // Clear existing interval
            if (this.nowPlayingInterval) {
                clearInterval(this.nowPlayingInterval);
            }
            
            // Start polling for track info
            this.nowPlayingInterval = setInterval(() => {
                if (this.currentStationId === stationId && this.currentAudio && !this.currentAudio.paused) {
                    this.updateNowPlaying();
                }
            }, station.pollInterval);
            
        }).catch(error => {
            console.error('Play error for', stationId, ':', error);
            alert('Cannot play: ' + stationId);
            this.stopStream();
        });
    }

    switchToHeroView(station) {
        this.isHeroView = true;
        
        // Update hero view with station info
        const heroLogo = document.getElementById('heroLogo');
        heroLogo.src = station.logo;
        heroLogo.alt = station.name;
        
        // Hide grid view and show hero view
        const gridView = document.getElementById('gridView');
        const heroView = document.getElementById('heroView');
        
        gridView.classList.add('hidden');
        heroView.classList.remove('hidden');
        
        // Trigger animation after a brief delay to ensure DOM update
        setTimeout(() => {
            heroView.classList.add('active');
        }, 50);
    }

    switchToGridView() {
        this.isHeroView = false;
        
        const gridView = document.getElementById('gridView');
        const heroView = document.getElementById('heroView');
        
        // Start transition
        heroView.classList.remove('active');
        
        // After transition completes, show grid view
        setTimeout(() => {
            heroView.classList.add('hidden');
            gridView.classList.remove('hidden');
        }, 600);
    }

    viewSavedTracks() {
        this.isHeroView = false;
        
        const gridView = document.getElementById('gridView');
        const heroView = document.getElementById('heroView');
        
        // Start transition
        heroView.classList.remove('active');
        
        // After transition completes, show grid view and scroll to saved tracks
        setTimeout(() => {
            heroView.classList.add('hidden');
            gridView.classList.remove('hidden');
            
            // Scroll to saved tracks section smoothly
            setTimeout(() => {
                const savedTracksSection = document.querySelector('.saved-tracks');
                if (savedTracksSection) {
                    savedTracksSection.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 100);
        }, 600);
    }

    clearHeroDisplay() {
        document.getElementById('heroArtist').textContent = 'Loading...';
        document.getElementById('heroSong').textContent = 'Loading...';
        document.getElementById('heroAlbum').textContent = '';
    }

    togglePausePlay() {
        const button = document.getElementById('pausePlayButton');
        const heroButton = document.getElementById('heroPauseButton');
        
        if (this.currentAudio) {
            if (this.currentAudio.paused) {
                this.currentAudio.play();
                button.textContent = 'PAUSE';
                heroButton.querySelector('.hero-button-text').textContent = 'PAUSE';
                if (this.currentButton) {
                    this.currentButton.classList.remove('paused');
                    this.currentButton.classList.add('playing');
                }
            } else {
                this.currentAudio.pause();
                button.textContent = 'PLAY';
                heroButton.querySelector('.hero-button-text').textContent = 'PLAY';
                if (this.currentButton) {
                    this.currentButton.classList.remove('playing');
                    this.currentButton.classList.add('paused');
                }
            }
        }
    }

    stopStream() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        if (this.currentButton) {
            this.currentButton.classList.remove('playing', 'paused');
            this.currentButton = null;
        }
        
        if (this.nowPlayingInterval) {
            clearInterval(this.nowPlayingInterval);
            this.nowPlayingInterval = null;
        }
        
        this.currentStationId = '';
        this.lastTrackInfo = null;
        
        // Update both views
        document.getElementById('pausePlayButton').textContent = 'PAUSE';
        document.getElementById('currentSong').textContent = '';
        document.getElementById('albumInfo').textContent = '';
        this.clearHeroDisplay();
        
        // Return to grid view if in hero mode
        if (this.isHeroView) {
            this.switchToGridView();
        }
        
        // Clear Media Session
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = null;
        }
    }

    updateNowPlaying() {
        const station = STATION_CONFIG[this.currentStationId];
        if (!station) return;

        const songElement = document.getElementById('currentSong');

        // Handle stations without API
        if (!station.api) {
            const trackInfo = TrackParser.parseTrackInfo(this.currentStationId, null);
            if (!this.lastTrackInfo || trackInfo.displayText !== this.lastTrackInfo.displayText) {
                songElement.textContent = trackInfo.displayText;
                
                // Update hero view
                if (this.isHeroView) {
                    this.updateHeroView(trackInfo);
                }
                
                this.lastTrackInfo = trackInfo;
                this.updateMediaSessionMetadata(trackInfo);
            }
            return;
        }

        // Generate fresh URL for stations that need it
        let apiUrl = station.api;
        if (this.currentStationId === 'WFUV') {
            apiUrl = station.api + Date.now();
        }

        fetch(apiUrl)
            .then(response => {
                if (station.parser === 'kexp' || station.parser === 'wbgo' || station.parser === 'wfuv' || station.parser === 'kvrx') {
                    return response.json();
                } else {
                    return response.text();
                }
            })
            .then(data => {
                // Special handling for KVRX - the CORS proxy might return JSON as a string
                if (this.currentStationId === 'KVRX' && typeof data === 'string') {
                    console.log('KVRX received string data, attempting to parse:', data);
                    try {
                        data = JSON.parse(data);
                        console.log('KVRX parsed JSON successfully:', data);
                    } catch (e) {
                        console.log('KVRX JSON parse failed:', e);
                    }
                }
                
                // Add debug logging for WDVX and KVRX
                if (this.currentStationId === 'WDVX') {
                    console.log('WDVX API Response:', data);
                }
                if (this.currentStationId === 'KVRX') {
                    console.log('KVRX API Response:', data);
                    console.log('KVRX data type:', typeof data);
                }
                
                const trackInfo = TrackParser.parseTrackInfo(this.currentStationId, data);
                console.log(`${this.currentStationId} parsed track info:`, trackInfo);
                
                // Only update if track info has changed
                if (!this.lastTrackInfo || !this.tracksEqual(trackInfo, this.lastTrackInfo)) {
                    // Clear save success indicators when track changes
                    trackManager.clearSaveSuccess();
                    
                    // Update grid view
                    songElement.textContent = trackInfo.displayText;
                    
                    // Update hero view
                    if (this.isHeroView) {
                        this.updateHeroView(trackInfo);
                    }
                    
                    this.lastTrackInfo = trackInfo;
                    this.updateMediaSessionMetadata(trackInfo);
                    
                    // Start MusicBrainz lookup for album info
                    this.lookupAlbumInfo(trackInfo);
                }
            })
            .catch(error => {
                console.log('API error for', this.currentStationId, ':', error);
                const fallbackInfo = TrackParser.createFallbackTrack(this.currentStationId);
                if (!this.lastTrackInfo || fallbackInfo.displayText !== this.lastTrackInfo.displayText) {
                    songElement.textContent = fallbackInfo.displayText;
                    
                    // Update hero view with fallback
                    if (this.isHeroView) {
                        this.updateHeroView(fallbackInfo);
                    }
                    
                    this.lastTrackInfo = fallbackInfo;
                    this.updateMediaSessionMetadata(fallbackInfo);
                }
            });
    }

    updateHeroView(trackInfo) {
        document.getElementById('heroArtist').textContent = trackInfo.artist || 'Unknown Artist';
        document.getElementById('heroSong').textContent = trackInfo.title || 'Unknown Track';
    }

    tracksEqual(track1, track2) {
        if (!track1 || !track2) return false;
        return track1.artist === track2.artist && 
               track1.title === track2.title && 
               track1.station === track2.station;
    }

    getCurrentTrack() {
        return this.lastTrackInfo;
    }

    async lookupAlbumInfo(trackInfo) {
        // Skip lookup for unknown tracks or stations without real data
        if (!trackInfo || 
            trackInfo.artist === 'Unknown Artist' || 
            trackInfo.artist === 'Live Radio' ||
            trackInfo.title === 'Unknown Track' ||
            trackInfo.title === 'Track Data Not Available' ||
            trackInfo.displayText.startsWith('Listening to')) {
            return;
        }

        console.log('Starting MusicBrainz lookup for:', trackInfo.artist, '-', trackInfo.title);
        
        try {
            const albumInfo = await this.musicBrainzLookup.lookupTrackInfo(trackInfo.artist, trackInfo.title);
            
            // Make sure we're still on the same track when the lookup completes
            if (this.lastTrackInfo && 
                this.lastTrackInfo.artist === trackInfo.artist && 
                this.lastTrackInfo.title === trackInfo.title) {
                
                const albumElement = document.getElementById('albumInfo');
                const heroAlbumElement = document.getElementById('heroAlbum');
                
                if (albumInfo && albumInfo.album && albumInfo.year) {
                    const albumText = `${albumInfo.album} • ${albumInfo.year}`;
                    albumElement.textContent = albumText;
                    heroAlbumElement.textContent = albumText;
                    console.log('MusicBrainz lookup completed:', albumInfo);
                } else {
                    albumElement.textContent = '';
                    heroAlbumElement.textContent = '';
                    console.log('MusicBrainz lookup found no results');
                }
            }
        } catch (error) {
            console.log('MusicBrainz lookup error:', error);
        }
    }
}