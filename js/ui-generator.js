// UI Generator
class UIGenerator {
    static generateStationButtons() {
        const container = document.getElementById('stationsGrid');
        container.innerHTML = '';

        Object.keys(STATION_CONFIG).forEach(stationId => {
            const station = STATION_CONFIG[stationId];
            
            const button = document.createElement('button');
            button.className = 'radio-button';
            button.style.width = 'calc(50% - 7.5px)';
            button.style.flexShrink = '0';
            button.setAttribute('data-station', stationId);
            button.onclick = () => radioPlayer.toggleStation(stationId);
            
            button.innerHTML = `
                <div class="logo-container">
                    <img src="${station.logo}" alt="${station.name}">
                </div>
                <span>${station.location}</span>
            `;
            
            container.appendChild(button);
        });
    }
}