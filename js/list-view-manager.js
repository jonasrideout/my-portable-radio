// List View Manager - Handles all List View functionality
class ListViewManager {
    constructor() {
        this.isListViewVisible = false;
        this.initializeListView();
    }

    initializeListView() {
        // Make sure the list view elements exist
        const listView = document.getElementById('listView');
        if (!listView) {
            console.error('List View HTML elements not found');
            return;
        }
        
        // Initialize with current saved tracks
        this.updateListDisplay();
    }

    showListView() {
        const gridView = document.getElementById('gridView');
        const heroView = document.getElementById('heroView');
        const listView = document.getElementById('listView');

        if (!listView) {
            console.error('List View element not found');
            return;
        }

        // Hide other views
        if (gridView) gridView.classList.add('hidden');
        if (heroView) {
            heroView.classList.remove('active');
            heroView.classList.add('hidden');
        }

        // Show list view
        listView.classList.remove('hidden');
        this.isListViewVisible = true;

        // Update the display with current tracks immediately
        this.updateListDisplay();

        console.log('List View shown and updated');
    }

    hideListView() {
        const listView = document.getElementById('listView');
        if (listView) {
            listView.classList.add('hidden');
        }
        this.isListViewVisible = false;
        console.log('List View hidden');
    }

    updateListDisplay() {
        const listElement = document.getElementById('listSavedTracksList');
        const countElement = document.getElementById('listTrackCount');

        // Only update if we're in list view AND the elements exist
        if (!this.isListViewVisible || !listElement || !countElement) {
            if (!listElement || !countElement) {
                console.log('List View elements not ready yet, skipping update');
            }
            return;
        }

        // Get saved tracks from trackManager
        const savedTracks = trackManager ? trackManager.savedTracks : [];
        console.log('Updating list display with', savedTracks.length, 'tracks');

        // Update count
        countElement.textContent = `(${savedTracks.length})`;

        // Update list content
        if (savedTracks.length === 0) {
            listElement.innerHTML = '<div class="empty-state">Click the + button or "ADD TO LIST" to save tracks you discover!</div>';
        } else {
            // Create header row
            const headerHTML = `<div class="saved-tracks-list-header">
                <div class="header-artist">ARTIST</div>
                <div class="header-song">SONG</div>
                <div class="header-album">ALBUM</div>
                <div class="header-year">YEAR</div>
                <div class="header-remove"></div>
            </div>`;
            
            // Create track rows
            const tracksHTML = savedTracks.map((track, index) => {
                return `<div class="saved-track-item">
                    <div class="track-info-text">
                        <div class="track-artist">${track.artist || 'Unknown Artist'}</div>
                        <div class="track-song">${track.title || 'Unknown Track'}</div>
                        <div class="track-album">${track.album || ''}</div>
                        <div class="track-year">${track.year || ''}</div>
                    </div>
                    <button class="remove-track" onclick="listViewManager.removeTrack(${index})">×</button>
                </div>`;
            }).join('');
            
            listElement.innerHTML = headerHTML + tracksHTML;
        }

        console.log(`List View updated with ${savedTracks.length} tracks`);
    }

    removeTrack(index) {
        if (trackManager) {
            trackManager.removeTrack(index);
            // Force immediate update of display
            setTimeout(() => {
                this.updateListDisplay();
            }, 50);
        }
    }

    clearAllTracks() {
        if (trackManager) {
            trackManager.clearSavedTracks();
            // Force immediate update of display
            setTimeout(() => {
                this.updateListDisplay();
            }, 50);
        }
    }

    // Called when a new track is saved - ENHANCED for immediate updates
    onTrackSaved() {
        console.log('onTrackSaved called - updating list view');
        // Force immediate update by calling updateListDisplay directly
        // bypassing the visibility check since we know we need to update
        this.forceUpdateDisplay();
        
        // Also force update the view button state
        if (radioPlayer) {
            radioPlayer.updatePersistentButtonText();
        }
    }

    // Called when tracks are updated (e.g., MusicBrainz data) - ENHANCED
    onTracksUpdated() {
        console.log('onTracksUpdated called - updating list view');
        // Force immediate update only if we're in list view
        if (this.isListViewVisible) {
            this.forceUpdateDisplay();
        }
    }

    // NEW METHOD: Force update the display regardless of visibility checks
    forceUpdateDisplay() {
        const listElement = document.getElementById('listSavedTracksList');
        const countElement = document.getElementById('listTrackCount');

        if (!listElement || !countElement) {
            console.log('List View elements not found, cannot update');
            return;
        }

        // Get saved tracks from trackManager
        const savedTracks = trackManager ? trackManager.savedTracks : [];
        console.log('Force updating list display with', savedTracks.length, 'tracks');

        // Update count
        countElement.textContent = `(${savedTracks.length})`;

        // Update list content
        if (savedTracks.length === 0) {
            listElement.innerHTML = '<div class="empty-state">Click the + button or "ADD TO LIST" to save tracks you discover!</div>';
        } else {
            // Create header row
            const headerHTML = `<div class="saved-tracks-list-header">
                <div class="header-artist">ARTIST</div>
                <div class="header-song">SONG</div>
                <div class="header-album">ALBUM</div>
                <div class="header-year">YEAR</div>
                <div class="header-remove"></div>
            </div>`;
            
            // Create track rows
            const tracksHTML = savedTracks.map((track, index) => {
                return `<div class="saved-track-item">
                    <div class="track-info-text">
                        <div class="track-artist">${track.artist || 'Unknown Artist'}</div>
                        <div class="track-song">${track.title || 'Unknown Track'}</div>
                        <div class="track-album">${track.album || ''}</div>
                        <div class="track-year">${track.year || ''}</div>
                    </div>
                    <button class="remove-track" onclick="listViewManager.removeTrack(${index})">×</button>
                </div>`;
            }).join('');
            
            listElement.innerHTML = headerHTML + tracksHTML;
        }

        console.log(`List View force updated with ${savedTracks.length} tracks`);
    }

    // Check if List View is currently visible
    isVisible() {
        return this.isListViewVisible;
    }

    // NEW METHOD: Force refresh the entire list view
    forceRefresh() {
        console.log('Force refreshing list view');
        if (this.isListViewVisible) {
            this.forceUpdateDisplay();
        }
        
        // Also update the view button state
        if (radioPlayer) {
            radioPlayer.updatePersistentButtonText();
        }
    }
}
