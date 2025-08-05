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
        const heroButton = document.getElementById('heroSaveButton');
        
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
            
            // Show success feedback on both buttons
            this.showSaveSuccess(button);
            this.showSaveSuccess(heroButton);
            
            // Enable view button
            this.updateViewButtonState();
        }
    }

    showSaveSuccess(button) {
        if (!button) return;
        
        const originalIcon = button.querySelector('.hero-button-icon, .save-track-button') ? 
                           button.querySelector('.hero-button-icon').textContent : 
                           button.textContent;
        
        // Show checkmark
        if (button.querySelector('.hero-button-icon')) {
            button.querySelector('.hero-button-icon').textContent = '✓';
            button.classList.add('saved');
        } else {
            button.textContent = '✓';
            button.classList.add('saved');
        }
        
        // Store original state to restore later
        button.dataset.originalIcon = originalIcon;
        button.dataset.showingSuccess = 'true';
    }

    clearSaveSuccess() {
        const button = document.getElementById('saveTrackButton');
        const heroButton = document.getElementById('heroSaveButton');
        
        [button, heroButton].forEach(btn => {
            if (btn && btn.dataset.showingSuccess === 'true') {
                if (btn.querySelector('.hero-button-icon')) {
                    btn.querySelector('.hero-button-icon').textContent = btn.dataset.originalIcon || '+';
                    btn.classList.remove('saved');
                } else {
                    btn.textContent = btn.dataset.originalIcon || '+';
                    btn.classList.remove('saved');
                }
                btn.dataset.showingSuccess = 'false';
            }
        });
    }

    updateViewButtonState() {
        const heroViewButton = document.getElementById('heroViewButton');
        if (heroViewButton) {
            if (this.savedTracks.length > 0) {
                heroViewButton.classList.add('view-enabled');
            } else {
                heroViewButton.classList.remove('view-enabled');
            }
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
        }
    }

    updateSavedTracksList() {
        const listElement = document.getElementById('savedTracksList');
        const countElement = document.getElementById('trackCount');
        
        countElement.textContent = '(' + this.savedTracks.length + ')';
        
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

    removeTrack(index) {
        this.savedTracks.splice(index, 1);
        localStorage.setItem('savedTracks', JSON.stringify(this.savedTracks));
        this.updateSavedTracksList();
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
        if (confirm('Are you sure you want to clear all saved tracks?')) {
            this.savedTracks = [];
            localStorage.setItem('savedTracks', JSON.stringify(this.savedTracks));
            this.updateSavedTracksList();
        }
    }
}