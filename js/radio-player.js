// Radio Player Core
class RadioPlayer {
    constructor() {
        this.currentAudio = null;
        this.currentButton = null;
        this.currentStationId = '';
        this.nowPlayingInterval = null;
        this.lastTrackInfo = null;
        this.musicBrainzLookup = new MusicBrainzLookup();
        this.currentView = 'grid'; // 'grid', 'hero', or 'list'
        this.previousView = 'grid'; // Track previous view for smart switching
        this.initializeMediaSession();
        
        // Show persistent controls immediately when app loads
        this.showPersistentControls();
        this.updatePersistentButtonText();
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
            if (this.currentView === 'grid' && !this.currentAudio.paused) {
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

        // Update button text (controls are already visible)
        this.updatePersistentButtonText();

        // Switch to hero view with smooth transition
        this.switchToHeroView(station);

        // Create and configure audio
        this.currentAudio = new Audio(station.stream);
        this.currentAudio.volume = 0.8;

        this.currentAudio.oncanplaythrough = () => {
            document.getElementById('pausePlayButton').textContent = 'PAUSE';
            this.updatePersistentControlsText('PAUSE');
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

    showPersistentControls() {
        const persistentControls = document.getElementById('persistentControls');
        if (persistentControls) {
            persistentControls.classList.remove('hidden');
        }
    }

    hidePersistentControls() {
        // Keep controls always visible - don't hide them anymore
        // const persistentControls = document.getElementById('persistentControls');
        // if (persistentControls) {
        //     persistentControls.classList.add('hidden');
        // }
    }

    updatePersistentControlsText(pauseText) {
        const persistentPauseButton = document.getElementById('persistentPauseButton');
        if (persistentPauseButton) {
            const textElement = persistentPauseButton.querySelector('.persistent-button-text');
            if (textElement) {
                textElement.textContent = pauseText;
            }
        }
    }

    updatePersistentButtonText() {
        const viewButton = document.getElementById('persistentViewButton');
        if (viewButton) {
            const textElement = viewButton.querySelector('.persistent-button-text');
            if (textElement) {
                if (this.currentView === 'list') {
                    textElement.textContent = 'CLEAR ALL';
                    viewButton.classList.remove('view-enabled');
                    viewButton.classList.add('danger');
                } else {
                    textElement.textContent = 'VIEW LIST';
                    viewButton.classList.remove('danger');
                    if (trackManager && trackManager.savedTracks.length > 0) {
                        viewButton.classList.add('view-enabled');
                    } else {
                        viewButton.classList.remove('view-enabled');
                    }
                }
            }
        }
    }

    switchToGridView() {
        this.previousView = this.currentView;
        this.currentView = 'grid';
        
        const gridView = document.getElementById('gridView');
        const heroView = document.getElementById('heroView');
        const listView = document.getElementById('listView');
        
        // Hide other views
        heroView.classList.remove('active');
        heroView.classList.add('hidden');
        listView.classList.add('hidden');
        
        // Show grid view
        gridView.classList.remove('hidden');
        
        // Update list view manager state
        if (window.listViewManager) {
            listViewManager.isListViewVisible = false;
        }
        
        // Update button text
        this.updatePersistentButtonText();
    }

    switchToHeroView(station) {
        this.previousView = this.currentView;
        this.currentView = 'hero';
        
        // Update hero view with station info
        const heroLogo = document.getElementById('heroLogo');
        heroLogo.src = station.logo;
        heroLogo.alt = station.name;
        
        // Hide other views
        const gridView = document.getElementById('gridView');
        const heroView = document.getElementById('heroView');
        const listView = document.getElementById('listView');
        
        gridView.classList.add('hidden');
        listView.classList.add('hidden');
        heroView.classList.remove('hidden');
        
        // Update list view manager state
        if (window.listViewManager) {
            listViewManager.isListViewVisible = false;
        }
        
        // Trigger animation after a brief delay to ensure DOM update
        setTimeout(() => {
            heroView.classList.add('active');
        }, 50);
        
        // Update button text
        this.updatePersistentButtonText();
    }

    switchToListView() {
        this.previousView = this.currentView;
        this.currentView = 'list';
        
        // Use the list view manager to show the list view
        if (window.listViewManager) {
            listViewManager.showListView();
        } else {
            console.error('List View Manager not found');
            return;
        }
        
        // Update button text
        this.updatePersistentButtonText();
    }

    toggleViewMode() {
        if (this.currentView === 'list') {
            // From list view, go back to previous view
            if (this.previousView === 'hero' && this.currentStationId) {
                const station = STATION_CONFIG[this.currentStationId];
                if (station) {
                    this.switchToHeroView(station);
                }
            } else {
                this.switchToGridView();
            }
        } else if (this.currentView === 'hero') {
            this.switchToGridView();
        } else {
            // From grid view, switch to hero if we have a current station
            if (this.currentStationId) {
                const station = STATION_CONFIG[this.currentStationId];
                if (station) {
                    this.switchToHeroView(station);
                }
            }
        }
    }

    viewSavedTracks() {
        if (this.currentView === 'list') {
            // If we're in list view and this is the "CLEAR ALL" button
            if (window.listViewManager) {
                listViewManager.clearAllTracks();
            }
        } else {
            // Switch to list view
            this.switchToListView();
        }
    }

    clearHeroDisplay() {
        document.getElementById('heroArtist').textContent = 'Loading...';
        document.getElementById('heroSong').textContent = 'Loading...';
        document.getElementById('heroAlbum').textContent = '';
    }

    togglePausePlay() {
        const button = document.getElementById('pausePlayButton');
        
        if (this.currentAudio) {
            if (this.currentAudio.paused) {
                this.currentAudio.play();
                button.textContent = 'PAUSE';
                this.updatePersistentControlsText('PAUSE');
                if (this.currentButton) {
                    this.currentButton.classList.remove('paused');
                    this.currentButton.classList.add('playing');
                }
            } else {
                this.currentAudio.pause();
                button.textContent = 'PLAY';
                this.updatePersistentControlsText('PLAY');
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
        
        // Don't hide persistent controls anymore - keep them always visible
        // this.hidePersistentControls();
        
        // Return to grid view if in hero mode
        if (this.currentView === 'hero') {
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
                if (this.currentView === 'hero') {
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
                    if (this.currentView === 'hero') {
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
                    if (this.currentView === 'hero') {
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
