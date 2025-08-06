// Track Management System
class TrackManager {
    constructor() {
        this.savedTracks = JSON.parse(localStorage.getItem('savedTracks') || '[]');
        this.updateSavedTracksList();
        this.updateViewButtonState();
    }

    saveCurrentTrack() {
        const currentTrack = radioPlayer.getCurrentTrack();
        const button = document.getElementById('saveTrackButton');
        const persistentButton = document.getElementById('persistentSaveButton');
        
        if (!currentTrack || 
            currentTrack.displayText.startsWith('Listening to') || 
            currentTrack.displayText === 'Track Data Not Available' || 
            !radioPlayer.currentStationId) {
            return;
        }
        
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
        // Update the old grid view saved tracks (if it exists)
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
            
            listElement.innerHTML = this.savedTracks.map((track, index) => {
                const albumInfo = track.album ? track.album : '';
                const yearInfo = track.year ? ` (${track.year})` : '';
                
                return `<div class="saved-track-item">
                    <div class="track-info-text">
                        <strong>${track.artist} - ${track.title}${yearInfo}</strong><br>
                        <small>${albumInfo}</small>
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
            return `${track.artist} - ${track.title}${yearInfo}${albumInfo} (${track.station} - ${track.timestamp})`;
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
