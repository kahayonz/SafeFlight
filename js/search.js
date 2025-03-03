function fuzzyMatch(pattern, str) {
    pattern = pattern.toLowerCase();
    str = str.toLowerCase();
    let patternIdx = 0;
    let strIdx = 0;
    while (patternIdx < pattern.length && strIdx < str.length) {
        if (pattern[patternIdx] === str[strIdx]) patternIdx++;
        strIdx++;
    }
    return patternIdx === pattern.length;
}

function searchAirports(query) {
    if (!query || query.length < 2) return [];
    return airports.filter(airport => {
        return fuzzyMatch(query, airport.name) ||
               fuzzyMatch(query, airport.city) ||
               fuzzyMatch(query, airport.iata) ||
               fuzzyMatch(query, airport.country);
    }).slice(0, 5);
}

function performSearch(query) {
    if (query.length < 2) return;
    
    const airportResults = searchAirports(query);
    if (airportResults.length > 0) {
        const airport = airportResults[0];
        map.setView(airport.coordinates, 6);
        
        if (window.currentMarker) {
            map.removeLayer(window.currentMarker);
        }
        window.currentMarker = L.marker(airport.coordinates)
            .addTo(map)
            .bindPopup(`
                <div class="popup-content">
                    <div class="popup-title">${airport.name}</div>
                    <div class="popup-location">${airport.city}, ${airport.country}</div>
                    <div class="popup-cases">Code: ${airport.iata}</div>
                </div>
            `)
            .openPopup();

        document.querySelector('.info-value.location').textContent = `${airport.city}, ${airport.country}`;
        document.querySelector('.info-value.disease').textContent = airport.name;
        document.querySelector('.info-value.cases').textContent = airport.iata;
    }
}
