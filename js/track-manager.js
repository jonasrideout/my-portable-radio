// Track Management System
class TrackManager {
    constructor() {
        this.savedTracks = JSON.parse(localStorage.getItem('savedTracks') || '[]');
        this.updateSavedTracksList();
        this.updateViewButtonState();
    }

    saveCurrentTrack() {
        console.log('saveCurrentTrack called');
        
        // Use global radioPlayer reference
        const currentTrack = window.radioPlayer ? window.radioPlayer.getCurrentTrack() : null;
        const button = document.getElementById('saveTrackButton');
        const persistentButton = document.getElementById('persistentSaveButton');
        
        console.log('Current track:', currentTrack);
        console.log('RadioPlayer exists:', !!window.radioPlayer);
        console.log('Current station:', window.radioPlayer ? window.radioPlayer.currentStationId : 'none');
        
        if (!currentTrack) {
            console.log('Cannot save track - no current track');
            return;
        }
        
        if (currentTrack.displayText.startsWith('Listening to')) {
            console.log('Cannot save track - starts with "Listening to"');
            return;
        }
        
        if (currentTrack.displayText === 'Track Data Not Available') {
            console.log('Cannot save track - track data not available');
            return;
        }
        
        if (!window.radioPlayer || !window.radioPlayer.currentStationId) {
            console.log('Cannot save track - no player or station ID');
            return;
        }
        
        console.log('All checks passed - proceeding to save track');
        
        const track = {
            station: currentTrack.station,
            artist: currentTrack.artist,
            title: currentTrack.title,
            album: currentTrack.album,
            year: currentTrack.year,
            displayText: currentTrack.displayText,
            timestamp: new Date().toLocaleString(),
            raw: currentTrack.raw
        };
        
        // Check for duplicates
        const isDuplicate = this.savedTracks.some(t => 
            t.station === track.station && 
            t.artist === track.artist && 
            t.title === track.title
        );
        
        if (!isDuplicate) {
            this.savedTracks.unshift(track);
            localStorage.setItem('savedTracks', JSON.stringify(this.savedTracks));
            this.updateSavedTracksList();
            
            // Notify list view manager that tracks were updated
            if (window.listViewManager) {
                listViewManager.onTrackSaved();
            }
            
            // Show success feedback on both buttons
            this.showSaveSuccess(button);
            this.showSaveSuccess(persistentButton);
            
            // Update view button state
            this.updateViewButtonState();
        }
    }

    showSaveSuccess(button) {
        if (!button) return;
        
        const originalText = button.querySelector('.persistent-button-text') ? 
                           button.querySelector('.persistent-button-text').textContent : 
                           button.textContent;
        
        // Show checkmark
        if (button.querySelector('.persistent-button-text')) {
            button.querySelector('.persistent-button-text').textContent = 'SAVED';
            button.classList.add('saved');
        } else {
            button.textContent = '✓';
            button.classList.add('saved');
        }
        
        // Store original state to restore later
        button.dataset.originalText = originalText;
        button.dataset.showingSuccess = 'true';
    }

    clearSaveSuccess() {
        const button = document.getElementById('saveTrackButton');
        const persistentButton = document.getElementById('persistentSaveButton');
        
        [button, persistentButton].forEach(btn => {
            if (btn && btn.dataset.showingSuccess === 'true') {
                if (btn.querySelector('.persistent-button-text')) {
                    btn.querySelector('.persistent-button-text').textContent = btn.dataset.originalText || 'ADD TO LIST';
                    btn.classList.remove('saved');
                } else {
                    btn.textContent = btn.dataset.originalText || '+';
                    btn.classList.remove('saved');
                }
                btn.dataset.showingSuccess = 'false';
            }
        });
    }

    updateViewButtonState() {
        const persistentViewButton = document.getElementById('persistentViewButton');
        if (persistentViewButton && radioPlayer) {
            // Update persistent button text and styling
            radioPlayer.updatePersistentButtonText();
        }
    }

    updateTrackWithMusicBrainzData(artist, title, albumInfo) {
        // Find and update any saved tracks that match this artist/title
        let updated = false;
        this.savedTracks.forEach(track => {
            if (track.artist === artist && track.title === title) {
                track.album = albumInfo.album;
                track.year = albumInfo.year;
                updated = true;
            }
        });
        
        if (updated) {
            localStorage.setItem('savedTracks', JSON.stringify(this.savedTracks));
            this.updateSavedTracksList();
            
            // Notify list view manager that tracks were updated
            if (window.listViewManager) {
                listViewManager.onTracksUpdated();
            }
        }
    }

    updateSavedTracksList() {
        // Update the old grid view saved tracks (if it exists) - this is legacy code
        const listElement = document.getElementById('savedTracksList');
        const countElement = document.getElementById('trackCount');
        
        if (countElement) {
            countElement.textContent = '(' + this.savedTracks.length + ')';
        }
        
        if (listElement) {
            if (this.savedTracks.length === 0) {
                listElement.innerHTML = '<div class="empty-state">Click the + button next to "Now Playing" to save tracks you discover!</div>';
                return;
            }
            
            // Legacy format - keeping for backward compatibility if old grid view exists
            listElement.innerHTML = this.savedTracks.map((track, index) => {
                // Format album info like hero view (Album • Year)
                let albumText = '';
                if (track.album && track.year) {
                    albumText = `${track.album} • ${track.year}`;
                } else if (track.album) {
                    albumText = track.album;
                } else if (track.year) {
                    albumText = `(${track.year})`;
                }
                
                return `<div class="saved-track-item">
                    <div class="track-info-text">
                        <div class="track-field">
                            <div class="track-label">ARTIST</div>
                            <div class="track-content">${track.artist || 'Unknown Artist'}</div>
                        </div>
                        <div class="track-field">
                            <div class="track-label">SONG</div>
                            <div class="track-content">${track.title || 'Unknown Track'}</div>
                        </div>
                        ${albumText ? `<div class="track-field">
                            <div class="track-label">ALBUM</div>
                            <div class="track-content">${albumText}</div>
                        </div>` : ''}
                    </div>
                    <button class="remove-track" onclick="trackManager.removeTrack(${index})">×</button>
                </div>`;
            }).join('');
        }
    }

    removeTrack(index) {
        this.savedTracks.splice(index, 1);
        localStorage.setItem('savedTracks', JSON.stringify(this.savedTracks));
        this.updateSavedTracksList();
        
        // Notify list view manager that tracks were updated
        if (window.listViewManager) {
            listViewManager.onTracksUpdated();
        }
        
        this.updateViewButtonState();
    }

    downloadSavedTracks() {
        if (this.savedTracks.length === 0) {
            alert('No saved tracks to download!');
            return;
        }
        
        const content = this.savedTracks.map(track => {
            const yearInfo = track.year ? ` (${track.year})` : '';
            const albumInfo = track.album ? ` [${track.album}]` : '';
            console.log('Download track:', track); // Debug logging
            return `${track.artist} - ${track.title}${yearInfo}${albumInfo} (${track.timestamp})`;
        }).join('\n');
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'saved-radio-tracks.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearSavedTracks() {
        if (this.savedTracks.length === 0) {
            return; // Nothing to clear
        }
        
        if (confirm('Are you sure you want to clear all saved tracks?')) {
            this.savedTracks = [];
            localStorage.setItem('savedTracks', JSON.stringify(this.savedTracks));
            this.updateSavedTracksList();
            
            // Notify list view manager that tracks were cleared
            if (window.listViewManager) {
                listViewManager.onTracksUpdated();
            }
            
            this.updateViewButtonState();
        }
    }
}
