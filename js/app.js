// Main application initialization
let radioPlayer;
let trackManager;
let listViewManager;

document.addEventListener('DOMContentLoaded', function() {
    radioPlayer = new RadioPlayer();
    trackManager = new TrackManager();
    listViewManager = new ListViewManager();
    UIGenerator.generateStationButtons();
    
    // Make radioPlayer globally accessible for other modules
    window.radioPlayer = radioPlayer;
});
