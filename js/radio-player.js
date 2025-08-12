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
        this.audioReady = false; // Track when audio is ready for new track info
        this.pendingTrackInfo = null; // Hold track info until audio is ready
        this.lastAudioTime = 0; // Track audio time for jump detection
        this.warmedStations = new Set(); // Track which stations have been warmed up
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
                        
                        if (trackInfo.album) {
                            album = trackInfo.album;
                            if (trackInfo.year) {
                                album += ` (${trackInfo.year})`;
                            }
                        }
                    } else {
                        title = `${station.name} Radio`;
                        artist = station.location;
                    }
                }
            }
            
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: title,
                    artist: artist,
                    album: album,
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
        this.audioReady = false; // Track audio readiness
        this.pendingTrackInfo = null; // Hold track info until audio is ready

        // Set initial metadata when starting to play a station
        this.updateMediaSessionMetadata(null);

        // Clear both grid and hero displays immediately
        document.getElementById('currentSong').textContent = 'Loading...';
        document.getElementById('albumInfo').textContent = '';
        this.clearHeroDisplay();

        // Update button text (controls are already visible)
        this.updatePersistentButtonText();

        // Switch to hero view with smooth transition
        this.switchToHeroView(station);

        // Create and configure audio with event listeners
        this.currentAudio = new Audio(station.stream);
        this.currentAudio.volume = 0.8;

        // Audio event listeners for track sync
        this.currentAudio.addEventListener('loadstart', () => {
            console.log('Audio loadstart - clearing track info for transition');
            this.audioReady = false;
            this.pendingTrackInfo = null;
            
            // Show loading state
            document.getElementById('currentSong').textContent = 'Loading new track...';
            document.getElementById('albumInfo').textContent = '';
            if (this.currentView === 'hero') {
                document.getElementById('heroArtist').textContent = 'Loading...';
                document.getElementById('heroSong').textContent = 'Loading...';
                document.getElementById('heroAlbum').textContent = '';
            }
        });

        this.currentAudio.addEventListener('canplay', () => {
            console.log('Audio canplay - ready to show new track info');
            this.audioReady = true;
            
            // If we have pending track info, show it now
            if (this.pendingTrackInfo) {
                this.displayTrackInfo(this.pendingTrackInfo);
                this.pendingTrackInfo = null;
            }
            
            document.getElementById('pausePlayButton').textContent = 'PAUSE';
            this.updatePersistentControlsText('PAUSE');
        });

        this.currentAudio.addEventListener('timeupdate', () => {
            // Detect if audio restarted (potential track change)
            if (this.currentAudio.currentTime < 2 && this.lastAudioTime > 10) {
                console.log('Audio time jump detected - possible track change');
                this.audioReady = false;
            }
            this.lastAudioTime = this.currentAudio.currentTime;
        });

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
        if (typeof listViewManager !== 'undefined') {
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
        if (typeof listViewManager !== 'undefined') {
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
        if (typeof listViewManager !== 'undefined') {
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
            if (typeof listViewManager !== 'undefined') {
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
        
        // Clear Media Session metadata
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = null;
        }
    }

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
        
        // Update save button state when track info changes
        if (trackManager) {
            trackManager.updateSaveButtonState();
        }
        
        // Start MusicBrainz lookup for album info (only for real tracks)
        this.lookupAlbumInfo(trackInfo);
    }

    updateNowPlaying() {
        const station = STATION_CONFIG[this.currentStationId];
        if (!station) return;

        // Handle stations without API
        if (!station.api) {
            const trackInfo = TrackParser.parseTrackInfo(this.currentStationId, null);
            if (trackInfo && (!this.lastTrackInfo || trackInfo.displayText !== this.lastTrackInfo.displayText)) {
                if (this.audioReady) {
                    this.displayTrackInfo(trackInfo);
                } else {
                    this.pendingTrackInfo = trackInfo;
                    console.log('Audio not ready, holding track info:', trackInfo);
                }
            }
            return;
        }

        // Generate fresh URL with cache-busting
        let apiUrl = station.api;
        if (this.currentStationId === 'WFUV') {
            apiUrl = station.api + Date.now();
        } else if (station.api) {
            // Add cache-busting to all stations to ensure fresh data
            const separator = station.api.includes('?') ? '&' : '?';
            apiUrl = station.api + separator + 't=' + Date.now();
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
                
                // Skip update if parser returned null (invalid data)
                if (!trackInfo) {
                    console.log('Parser returned null - keeping previous track info');
                    return;
                }
                
                // Debug track comparison
                const isTrackEqual = this.lastTrackInfo ? this.tracksEqual(trackInfo, this.lastTrackInfo) : false;
                const wfmuBypass = (trackInfo.station === 'WFMU' && trackInfo.album);
                const wdvxBypass = (trackInfo.station === 'WDVX' && trackInfo.artist !== 'Unknown Artist' && !trackInfo.album);
                
                console.log('Update decision:', {
                    hasLastTrack: !!this.lastTrackInfo,
                    isTrackEqual,
                    wfmuBypass,
                    wdvxBypass,
                    station: trackInfo.station,
                    artist: trackInfo.artist,
                    album: trackInfo.album
                });
                
                // Only update if track info has changed (or it's WFMU/WDVX needing MusicBrainz help)
                const shouldUpdate = !this.lastTrackInfo || 
                                   !isTrackEqual ||
                                   wfmuBypass ||
                                   wdvxBypass;
                
                if (shouldUpdate) {
                    console.log('Track info changed - processing update');
                    // Clear save success indicators when track changes
                    trackManager.clearSaveSuccess();
                    
                    // Check if audio is ready to display new track info
                    if (this.audioReady) {
                        // Clear album info immediately when track changes (will be updated by MusicBrainz if valid)
                        document.getElementById('albumInfo').textContent = '';
                        document.getElementById('heroAlbum').textContent = '';
                        
                        console.log('Audio ready - displaying track info immediately');
                        this.displayTrackInfo(trackInfo);
                    } else {
                        // Hold the track info until audio is ready
                        this.pendingTrackInfo = trackInfo;
                        console.log('Audio not ready, holding track info:', trackInfo.artist, '-', trackInfo.title);
                    }
                }
            })
            .catch(error => {
                console.log('API error for', this.currentStationId, ':', error);
                // Don't parse or update anything on API errors - just keep showing last good track info
                console.log('Keeping previous track info due to API error');
                // Exit early - don't let any parser run with bad data
                return;
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

    // Pre-warm station APIs to improve responsiveness
    warmAllStations() {
        console.log('Warming up all station APIs...');
        Object.keys(STATION_CONFIG).forEach(stationId => {
            this.warmStation(stationId);
        });
    }

    warmStation(stationId) {
        // Skip if already warmed or no API
        if (this.warmedStations.has(stationId)) {
            return;
        }

        const station = STATION_CONFIG[stationId];
        if (!station || !station.api) {
            this.warmedStations.add(stationId);
            return;
        }

        console.log(`Warming up ${stationId} API...`);

        // Generate API URL with cache-busting
        let apiUrl = station.api;
        if (stationId === 'WFUV') {
            apiUrl = station.api + Date.now();
        } else if (station.api) {
            // Add cache-busting to all stations to ensure fresh data
            const separator = station.api.includes('?') ? '&' : '?';
            apiUrl = station.api + separator + 't=' + Date.now();
        }

        // Make silent API call to warm up endpoint
        fetch(apiUrl)
            .then(response => {
                if (station.parser === 'kexp' || station.parser === 'wbgo' || station.parser === 'wfuv' || station.parser === 'kvrx') {
                    return response.json();
                } else {
                    return response.text();
                }
            })
            .then(data => {
                console.log(`${stationId} API warmed successfully`);
                this.warmedStations.add(stationId);
                
                // Parse the data to further warm up the parsing pipeline
                TrackParser.parseTrackInfo(stationId, data);
            })
            .catch(error => {
                console.log(`${stationId} API warming failed (this is normal):`, error.message);
                // Don't mark as warmed on failure, allow retry on hover
            });
    }

    isRealTrackInfo(trackInfo) {
        // Check if we have real track info vs unknown/fallback data
        return trackInfo && 
               trackInfo.artist && 
               trackInfo.title &&
               trackInfo.artist !== 'Unknown Artist' && 
               trackInfo.artist !== 'Live Radio' &&
               trackInfo.title !== 'Unknown Track' &&
               trackInfo.title !== 'Track Data Not Available' &&
               !trackInfo.displayText.startsWith('Listening to');
    }

    async lookupAlbumInfo(trackInfo) {
        console.log('lookupAlbumInfo called with:', trackInfo);
        
        // Only lookup album info for real tracks
        if (!this.isRealTrackInfo(trackInfo)) {
            console.log('Skipping MusicBrainz lookup for non-real track:', trackInfo);
            return;
        }
        
        console.log('Track passed isRealTrackInfo check');

        // KEXP station-specific logic: Use station data preferentially
        if (trackInfo.station === 'KEXP') {
            if (trackInfo.album && trackInfo.year) {
                // Complete KEXP data - use it and skip MusicBrainz
                console.log('KEXP: Complete station data, skipping MusicBrainz lookup');
                const albumElement = document.getElementById('albumInfo');
                const heroAlbumElement = document.getElementById('heroAlbum');
                const albumText = `${trackInfo.album} • ${trackInfo.year}`;
                albumElement.textContent = albumText;
                heroAlbumElement.textContent = albumText;
                return;
            } else if (trackInfo.album && !trackInfo.year) {
                // KEXP has album but no year - use MusicBrainz only for year lookup
                console.log('KEXP: Has album, looking up year only via MusicBrainz');
                try {
                    const albumInfo = await this.musicBrainzLookup.lookupTrackInfo(trackInfo.artist, trackInfo.title);
                    
                    if (this.lastTrackInfo && 
                        this.lastTrackInfo.artist === trackInfo.artist && 
                        this.lastTrackInfo.title === trackInfo.title) {
                        
                        const albumElement = document.getElementById('albumInfo');
                        const heroAlbumElement = document.getElementById('heroAlbum');
                        
                        if (albumInfo && albumInfo.year) {
                            // Use KEXP album + MusicBrainz year
                            const albumText = `${trackInfo.album} • ${albumInfo.year}`;
                            albumElement.textContent = albumText;
                            heroAlbumElement.textContent = albumText;
                            this.lastTrackInfo.year = albumInfo.year; // Keep KEXP album, add year
                            console.log('KEXP: Combined station album with MusicBrainz year:', {album: trackInfo.album, year: albumInfo.year});
                        } else {
                            // Just show KEXP album without year
                            const albumText = trackInfo.album;
                            albumElement.textContent = albumText;
                            heroAlbumElement.textContent = albumText;
                            console.log('KEXP: Using station album only, no year found');
                        }
                    }
                } catch (error) {
                    // Show KEXP album even if MusicBrainz fails
                    const albumElement = document.getElementById('albumInfo');
                    const heroAlbumElement = document.getElementById('heroAlbum');
                    albumElement.textContent = trackInfo.album;
                    heroAlbumElement.textContent = trackInfo.album;
                    console.log('KEXP: MusicBrainz failed, using station album only');
                }
                return;
            } else {
                // No album from KEXP - use MusicBrainz completely
                console.log('KEXP: No album from station, using MusicBrainz completely');
            }
        }

        // For non-KEXP stations: Show station album data immediately, then enhance with MusicBrainz
        if (trackInfo.album) {
            // Display station album immediately
            const albumElement = document.getElementById('albumInfo');
            const heroAlbumElement = document.getElementById('heroAlbum');
            
            if (trackInfo.year) {
                // Station provides both album and year
                const albumText = `${trackInfo.album} • ${trackInfo.year}`;
                albumElement.textContent = albumText;
                heroAlbumElement.textContent = albumText;
                console.log('Displaying complete station album data:', albumText);
                return; // Skip MusicBrainz
            } else {
                // Station provides album but no year - show album, then lookup year
                albumElement.textContent = trackInfo.album;
                heroAlbumElement.textContent = trackInfo.album;
                console.log('Displaying station album, looking up year via MusicBrainz:', trackInfo.album);
            }
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
                    
                    // UPDATE: Also update the lastTrackInfo object with MusicBrainz data
                    this.lastTrackInfo.album = albumInfo.album;
                    this.lastTrackInfo.year = albumInfo.year;
                    
                    console.log('MusicBrainz lookup completed and trackInfo updated:', albumInfo);
                } else if (albumInfo && albumInfo.year && trackInfo.album) {
                    // MusicBrainz found year but not album - combine station album + MusicBrainz year
                    const albumText = `${trackInfo.album} • ${albumInfo.year}`;
                    albumElement.textContent = albumText;
                    heroAlbumElement.textContent = albumText;
                    this.lastTrackInfo.year = albumInfo.year;
                    
                    console.log('Combined station album with MusicBrainz year:', {album: trackInfo.album, year: albumInfo.year});
                } else {
                    // MusicBrainz found nothing - keep station album data if we have it
                    if (trackInfo.album) {
                        albumElement.textContent = trackInfo.album;
                        heroAlbumElement.textContent = trackInfo.album;
                        console.log('MusicBrainz found no results, keeping station album:', trackInfo.album);
                    } else {
                        albumElement.textContent = '';
                        heroAlbumElement.textContent = '';
                        console.log('MusicBrainz found no results, no station album available');
                    }
                }
            } else {
                console.log('Track changed during MusicBrainz lookup, ignoring results');
            }
        } catch (error) {
            console.log('MusicBrainz lookup error:', error);
        }
    }
}
