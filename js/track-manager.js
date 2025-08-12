// Track Management System
class TrackManager {
    constructor() {
        this.savedTracks = JSON.parse(localStorage.getItem('savedTracks') || '[]');
        this.updateSavedTracksList();
        this.updateViewButtonState();
        this.updateSaveButtonState(); // Add this to initialize button state
    }

    saveCurrentTrack() {
        console.log('saveCurrentTrack called');
        console.log('window.radioPlayer:', window.radioPlayer);
        console.log('radioPlayer methods:', window.radioPlayer ? Object.getOwnPropertyNames(Object.getPrototypeOf(window.radioPlayer)) : 'no radioPlayer');
        
        // Use global radioPlayer reference - access lastTrackInfo directly
        const currentTrack = window.radioPlayer ? window.radioPlayer.lastTrackInfo : null;
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
        
        console.log('All checks passed - checking if track is already saved');
        
        // Check if track is already saved
        const existingIndex = this.savedTracks.findIndex(t => 
            t.station === currentTrack.station && 
            t.artist === currentTrack.artist && 
            t.title === currentTrack.title
        );
        
        if (existingIndex >= 0) {
            // Track exists - remove it
            console.log('Track already saved - removing from list');
            this.removeTrack(existingIndex);
            
            // Update button states to normal
            this.clearSaveSuccess();
            this.updateSaveButtonState();
            
            // Update view button state
            this.updateViewButtonState();
            return;
        }
        
        console.log('Track not saved yet - adding to list');
        
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
        
        // Add track to beginning of list
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
        
        console.log('Track saved successfully');
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
                    btn.querySelector('.persistent-button-text').textContent = btn.dataset.originalText || 'SAVE SONG';
                    btn.classList.remove('saved');
                } else {
                    btn.textContent = btn.dataset.originalText || '+';
                    btn.classList.remove('saved');
                }
                btn.dataset.showingSuccess = 'false';
            }
        });
    }

    // NEW METHOD: Update save button state based on current track
    updateSaveButtonState() {
        const button = document.getElementById('saveTrackButton');
        const persistentButton = document.getElementById('persistentSaveButton');
        
        // Get current track
        const currentTrack = window.radioPlayer ? window.radioPlayer.lastTrackInfo : null;
        
        console.log('updateSaveButtonState called, currentTrack:', currentTrack);
        
        // Check if we should disable the buttons (no valid track data)
        const shouldDisable = !currentTrack || 
                             currentTrack.displayText.startsWith('Listening to') ||
                             currentTrack.displayText === 'Track Data Not Available' ||
                             currentTrack.displayText === 'Loading...' ||
                             currentTrack.displayText === 'Loading new track...' ||
                             currentTrack.artist === 'Unknown Artist' ||
                             currentTrack.artist === 'Live Radio' ||
                             currentTrack.title === 'Unknown Track' ||
                             (currentTrack.artist === 'Unknown Artist' && currentTrack.title === 'Unknown Track');

        console.log('shouldDisable:', shouldDisable, 'reasons:', {
            noTrack: !currentTrack,
            listeningTo: currentTrack ? currentTrack.displayText.startsWith('Listening to') : false,
            noData: currentTrack ? currentTrack.displayText === 'Track Data Not Available' : false,
            loading: currentTrack ? (currentTrack.displayText === 'Loading...' || currentTrack.displayText === 'Loading new track...') : false,
            unknownArtist: currentTrack ? currentTrack.artist === 'Unknown Artist' : false,
            liveRadio: currentTrack ? currentTrack.artist === 'Live Radio' : false,
            unknownTrack: currentTrack ? currentTrack.title === 'Unknown Track' : false
        });

        if (shouldDisable) {
            // Clear any "SAVED" state first when disabling
            this.clearSaveSuccess();
            
            // Then disable the buttons
            [button, persistentButton].forEach(btn => {
                if (btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    console.log('Disabled button:', btn.id);
                }
            });
        } else {
            // Enable the buttons
            [button, persistentButton].forEach(btn => {
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    console.log('Enabled button:', btn.id);
                }
            });

            // Check if track is already saved and update button text accordingly
            const existingIndex = this.savedTracks.findIndex(t => 
                t.station === currentTrack.station && 
                t.artist === currentTrack.artist && 
                t.title === currentTrack.title
            );
            
            if (existingIndex >= 0) {
                // Track is already saved - show it as saved
                this.showSaveSuccess(button);
                this.showSaveSuccess(persistentButton);
            } else {
                // Track is not saved - clear any success state
                this.clearSaveSuccess();
            }
        }
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
        // Update save button state in case we removed the currently playing track
        this.updateSaveButtonState();
    }

    downloadSavedTracks() {
        if (this.savedTracks.length === 0) {
            alert('No saved tracks to download!');
            return;
        }
        
        this.generatePremiumPDF();
    }

    generatePremiumPDF() {
        // Create the PDF HTML content
        const pdfContent = this.createPDFHTML();
        
        // Create a new window with the PDF content
        const printWindow = window.open('', '_blank');
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        
        // Don't auto-print - let user choose via buttons
        printWindow.focus();
    }

    createPDFHTML() {
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const tracksHTML = this.savedTracks.map(track => {
            const saveDate = new Date(track.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            
            return `
                <tr>
                    <td>${track.artist || 'Unknown Artist'}</td>
                    <td>${track.title || 'Unknown Track'}</td>
                    <td>${track.album || ''}</td>
                    <td>${track.year || ''}</td>
                    <td class="date-column">${saveDate}</td>
                </tr>
            `;
        }).join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>My Portable Radio - Saved Tracks</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
            <style>
                @page {
                    margin: 0.75in;
                    size: A4;
                }
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Poppins', Arial, sans-serif;
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    min-height: 100vh;
                    padding: 40px;
                    color: #374151;
                }
                
                .pdf-container {
                    max-width: 100%;
                    margin: 0 auto;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                    backdrop-filter: blur(10px);
                }
                
                .pdf-header {
                    text-align: center;
                    margin-bottom: 40px;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 30px;
                }
                
                .pdf-title {
                    font-size: 32px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 0;
                    letter-spacing: -0.5px;
                }
                
                .pdf-actions {
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                    margin-bottom: 40px;
                    padding-bottom: 30px;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .action-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.9);
                    color: #374151;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    padding: 12px 24px;
                    font-size: 11px;
                    font-weight: 500;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    font-family: 'Poppins', Arial, sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    text-decoration: none;
                    min-width: 120px;
                }
                
                .action-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    background: rgba(255, 255, 255, 1);
                }
                
                .action-button:active {
                    transform: translateY(0);
                    transition: transform 0.1s ease;
                }
                
                .pdf-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    font-size: 14px;
                    color: #6b7280;
                }
                
                .tracks-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                
                .tracks-table thead th {
                    background: #f9fafb;
                    padding: 16px 12px;
                    text-align: left;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    color: #64748b;
                    border: 1px solid #e5e7eb;
                }
                
                .tracks-table tbody td {
                    padding: 14px 12px;
                    border: 1px solid #f3f4f6;
                    font-size: 11px;
                    line-height: 1.4;
                    color: #0f172a;
                }
                
                .tracks-table tbody tr:nth-child(even) {
                    background: #f9fafb;
                }
                
                .tracks-table tbody tr:hover {
                    background: #f3f4f6;
                }
                
                .date-column {
                    color: #6b7280;
                    font-size: 10px;
                    white-space: nowrap;
                }
                
                .pdf-footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #9ca3af;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 20px;
                }
                
                @media print {
                    body {
                        background: white;
                        padding: 0;
                    }
                    
                    .pdf-container {
                        background: white;
                        box-shadow: none;
                        border-radius: 0;
                        padding: 20px;
                    }
                    
                    .pdf-actions {
                        display: none;
                    }
                }
            </style>
            <script>
                function printPDF() {
                    window.print();
                }
                
                function downloadPDF() {
                    // Trigger browser's save as PDF functionality
                    window.print();
                }
            </script>
        </head>
        <body>
            <div class="pdf-container">
                <header class="pdf-header">
                    <h1 class="pdf-title">Saved Tracks</h1>
                </header>
                
                <div class="pdf-actions">
                    <button class="action-button" onclick="printPDF()">Print</button>
                    <button class="action-button" onclick="downloadPDF()">Save as PDF</button>
                </div>
                
                <div class="pdf-meta">
                    <span><strong>${this.savedTracks.length}</strong> tracks saved</span>
                    <span>Generated on ${currentDate}</span>
                </div>
                
                <table class="tracks-table">
                    <thead>
                        <tr>
                            <th>Artist</th>
                            <th>Song</th>
                            <th>Album</th>
                            <th>Year</th>
                            <th>Saved</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tracksHTML}
                    </tbody>
                </table>
                
                <footer class="pdf-footer">
                    <p>Discovered via My Portable Radio | https://my-portable-radio.vercel.app</p>
                </footer>
            </div>
        </body>
        </html>
        `;
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
            // Clear the save success state and update button state after clearing all
            this.clearSaveSuccess();
            this.updateSaveButtonState();
        }
    }
}
