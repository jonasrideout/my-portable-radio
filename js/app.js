// Main application initialization
let radioPlayer;
let trackManager;
let listViewManager;

document.addEventListener('DOMContentLoaded', function() {
    radioPlayer = new RadioPlayer();
    trackManager = new TrackManager();
    listViewManager = new ListViewManager();
    UIGenerator.generateStationButtons();
});
