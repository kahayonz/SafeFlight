// Global variables
window.airports = []; 
let airportsLoaded = false;

// Simplified search logic
function performSearch(query) {
    if (!airportsLoaded || !window.airports?.length) {
        console.warn('Airports data not yet loaded');
        return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const airport = window.airports.find(airport => 
        airport.iata.toLowerCase() === normalizedQuery ||
        airport.city.toLowerCase().includes(normalizedQuery) ||
        airport.country.toLowerCase().includes(normalizedQuery)
    );

    if (airport) handleAirportSelection(airport);
}

function handleAirportSelection(airport) {
    if (!airport || !airport.country) return;

    // Update search input
    document.getElementById('search').value = `${airport.city} (${airport.iata})`;

    // Find and highlight the country
    if (state.geojsonLayer) {
        state.geojsonLayer.eachLayer(layer => {
            if (layer.feature.properties.ADMIN === airport.country) {
                state.map.fitBounds(layer.getBounds());
                layer.setStyle({
                    weight: 2,
                    color: document.body.classList.contains('dark-mode') ? '#fff' : '#000',
                    dashArray: '',
                    fillOpacity: 0.9
                });
                
                updateInfoPanel(layer.feature.properties);
            }
        });
    }

    // Update location in info panel
    document.querySelector('.info-value.location').textContent = 
        `${airport.city}, ${airport.country}`;
}

function onAirportsLoaded(data) {
    try {
        if (!Array.isArray(data)) {
            throw new Error('Invalid airport data format');
        }

        window.airports = data.map(airport => ({
            name: airport.name,
            city: airport.city,
            country: airport.country,
            iata: airport.iata_code || airport.iata,
            coordinates: airport._geoloc ? 
                [airport._geoloc.lat, airport._geoloc.lng] :
                [airport.location?.lat, airport.location?.lng]
        })).filter(airport => 
            airport.coordinates[0] && 
            airport.coordinates[1] && 
            !isNaN(airport.coordinates[0]) && 
            !isNaN(airport.coordinates[1])
        );

        airportsLoaded = true;
        console.log(`Successfully loaded ${window.airports.length} airports`);
        
    } catch (error) {
        console.error('Error processing airport data:', error);
        window.airports = [];
        airportsLoaded = false;
    }
}

// Make these available globally
window.onAirportsLoaded = onAirportsLoaded;
