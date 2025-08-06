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

        // Update the display with current tracks
        this.updateListDisplay();

        console.log('List View shown');
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
        if (!this.isListViewVisible) return;

        const listElement = document.getElementById('listSavedTracksList');
        const countElement = document.getElementById('listTrackCount');

        if (!listElement || !countElement) {
            console.error('List View elements not found:', { listElement, countElement });
            return;
        }

        // Get saved tracks from trackManager
        const savedTracks = trackManager ? trackManager.savedTracks : [];

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
                <div class="header-remove"></div>
            </div>`;
            
            // Create track rows
            const tracksHTML = savedTracks.map((track, index) => {
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
                        <div class="track-artist">${track.artist || 'Unknown Artist'}</div>
                        <div class="track-song">${track.title || 'Unknown Track'}</div>
                        <div class="track-album">${albumText}</div>
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
            // Update display after removal
            this.updateListDisplay();
        }
    }

    clearAllTracks() {
        if (trackManager) {
            trackManager.clearSavedTracks();
            // Update display after clearing
            this.updateListDisplay();
        }
    }

    // Called when a new track is saved
    onTrackSaved() {
        if (this.isListViewVisible) {
            this.updateListDisplay();
        }
    }

    // Called when tracks are updated (e.g., MusicBrainz data)
    onTracksUpdated() {
        if (this.isListViewVisible) {
            this.updateListDisplay();
        }
    }

    // Check if List View is currently visible
    isVisible() {
        return this.isListViewVisible;
    }
}
