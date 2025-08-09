// Enhanced Media Session implementation for radio-player.js
// Add this to your existing RadioPlayer class

initializeMediaSession() {
    if ('mediaSession' in navigator) {
        // Set up action handlers
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

        // Initialize with default metadata
        this.updateMediaSessionMetadata(null);
    }
}

updateMediaSessionMetadata(trackInfo) {
    if ('mediaSession' in navigator) {
        let title = 'Loading...';
        let artist = 'My Portable Radio';
        let album = 'Live Radio';
        
        if (this.currentStationId) {
            const station = STATION_CONFIG[this.currentStationId];
            if (station) {
                album = `${station.name} - ${station.location}`;
                
                if (trackInfo && this.isRealTrackInfo(trackInfo)) {
                    title = trackInfo.title;
                    artist = trackInfo.artist;
                    
                    // If we have album info, add it to the album field
                    if (trackInfo.album) {
                        album = trackInfo.album;
                        if (trackInfo.year) {
                            album += ` (${trackInfo.year})`;
                        }
                    }
                } else {
                    // For non-real tracks or when loading
                    title = `${station.name} Radio`;
                    artist = station.location;
                }
            }
        }
        
        // Create and set the metadata
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist,
                album: album,
                // You can add artwork here if you have station logos as URLs
                artwork: this.getArtworkForCurrentStation()
            });
            
            console.log('Media Session metadata updated:', { title, artist, album });
        } catch (error) {
            console.log('Error setting media session metadata:', error);
        }
    }
}

getArtworkForCurrentStation() {
    if (!this.currentStationId) return [];
    
    const station = STATION_CONFIG[this.currentStationId];
    if (!station || !station.logo) return [];
    
    // Return artwork array with different sizes
    // The Media Session API expects an array of artwork objects
    return [
        {
            src: station.logo,
            sizes: '96x96',
            type: 'image/png'
        },
        {
            src: station.logo,
            sizes: '128x128', 
            type: 'image/png'
        },
        {
            src: station.logo,
            sizes: '192x192',
            type: 'image/png'
        },
        {
            src: station.logo,
            sizes: '256x256',
            type: 'image/png'
        },
        {
            src: station.logo,
            sizes: '384x384',
            type: 'image/png'
        },
        {
            src: station.logo,
            sizes: '512x512',
            type: 'image/png'
        }
    ];
}

// Update your existing displayTrackInfo method to call updateMediaSessionMetadata
displayTrackInfo(trackInfo) {
    console.log('Displaying track info:', trackInfo);
    
    // Update grid view
    document.getElementById('currentSong').textContent = trackInfo.displayText;
    
    // Update hero view
    if (this.currentView === 'hero') {
        this.updateHeroView(trackInfo);
    }
    
    this.lastTrackInfo = trackInfo;
    
    // Update Media Session with new track info
    this.updateMediaSessionMetadata(trackInfo);
    
    // Start MusicBrainz lookup for album info (only for real tracks)
    this.lookupAlbumInfo(trackInfo);
}

// Also update your playStation method to set initial metadata
playStation(stationId) {
    const station = STATION_CONFIG[stationId];
    if (!station) {
        alert('Station not configured: ' + stationId);
        return;
    }

    // ... existing code ...

    // Set initial metadata when starting to play a station
    this.updateMediaSessionMetadata(null);

    // ... rest of existing playStation code ...
}

// Update your stopStream method to clear metadata
stopStream() {
    // ... existing stopStream code ...
    
    // Clear Media Session metadata
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
    }
}
