// UI Generator
class UIGenerator {
    static generateStationButtons() {
        const container = document.getElementById('stationsGrid');
        container.innerHTML = '';

        Object.keys(STATION_CONFIG).forEach(stationId => {
            const station = STATION_CONFIG[stationId];
            
            const button = document.createElement('button');
            button.className = 'radio-button';
            button.setAttribute('data-station', stationId);
            button.onclick = () => radioPlayer.toggleStation(stationId);
            
            // Add hover listener for API warming
            button.addEventListener('mouseenter', () => {
                radioPlayer.warmStation(stationId);
            });
            
            button.innerHTML = `
                <div class="logo-container">
                    <img src="${station.logo}" alt="${station.name}">
                </div>
                <span>${station.location}</span>
            `;
            
            container.appendChild(button);
        });

        // Warm all stations after buttons are created
        setTimeout(() => {
            radioPlayer.warmAllStations();
        }, 100); // Small delay to let UI settle
    }
}
