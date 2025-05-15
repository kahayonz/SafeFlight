/*
for mao,
Features to add:
autocomplete suggestion dropdown
add countries with no iata code/no airports
*/
window.airports = []; 
let airportsLoaded = false;

// fixed logic for search
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

    // update search input
    document.getElementById('search').value = `${airport.city} (${airport.iata})`;

    // Find and highlight the country
    let found = false;
    let selectedLayerProps = null;
    if (state.geojsonLayer) {
        state.geojsonLayer.eachLayer(layer => {
            // Try matching by ADMIN, name, and also log for debugging
            const admin = (layer.feature.properties.ADMIN || '').toLowerCase();
            const name = (layer.feature.properties.name || '').toLowerCase();
            const airportCountry = (airport.country || '').toLowerCase();
            if (admin === airportCountry || name === airportCountry) {
                found = true;
                selectedLayerProps = layer.feature.properties;
                state.map.fitBounds(layer.getBounds());
                layer.setStyle({
                    weight: 2,
                    color: document.body.classList.contains('dark-mode') ? '#fff' : '#000',
                    dashArray: '',
                    fillOpacity: 0.9
                });
                // Debug: log what is being matched
                console.log('Matched country:', {admin, name, airportCountry, props: layer.feature.properties});
            } else {
                state.geojsonLayer.resetStyle(layer);
            }
        });
    }
    // Always update info panel for the selected country (if found)
    if (found && selectedLayerProps) {
        updateInfoPanel(selectedLayerProps);
    } else {
        if (typeof resetInfoPanel === 'function') resetInfoPanel();
    }
    // Debug: log what was searched and found
    if (!found) {
        console.warn('No country match found for:', airport.country);
        // Optionally, log all possible ADMIN and name values for debugging
        if (state.geojsonLayer) {
            state.geojsonLayer.eachLayer(layer => {
                console.log('Available country:', layer.feature.properties.ADMIN, layer.feature.properties.name);
            });
        }
    }

    // Update location in info panel
    // document.querySelector('.info-value.location').textContent = 
    //     `${airport.city}, ${airport.country}`;
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

// make loaded airports available to map/init.js
window.onAirportsLoaded = onAirportsLoaded;
