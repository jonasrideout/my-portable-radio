// Main application initialization
let radioPlayer;
let trackManager;

document.addEventListener('DOMContentLoaded', function() {
    radioPlayer = new RadioPlayer();
    trackManager = new TrackManager();
    UIGenerator.generateStationButtons();
});