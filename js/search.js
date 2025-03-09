// Global variables
window.airports = []; // Move to window to make it globally accessible
let airportsLoaded = false;
let searchTimeout = null;
let currentSuggestions = [];

function createSearchSuggestions() {
    const searchContainer = document.querySelector('.search-container');
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'search-suggestions';
    searchContainer.appendChild(suggestionsDiv);

    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            hideSuggestions();
        }
    });
}

function showSuggestions(suggestions) {
    const suggestionsDiv = document.querySelector('.search-suggestions');
    
    // Create suggestions div if it doesn't exist
    if (!suggestionsDiv) {
        createSearchSuggestions();
    }
    
    if (!suggestions || !suggestions.length) {
        hideSuggestions();
        return;
    }

    const suggestionsHtml = suggestions.map((airport, index) => `
        <div class="suggestion-item" data-iata="${airport.iata}" data-index="${index}">
            <div class="suggestion-primary">${airport.city} (${airport.iata})</div>
            <div class="suggestion-secondary">${airport.name}, ${airport.country}</div>
        </div>
    `).join('');

    document.querySelector('.search-suggestions').innerHTML = suggestionsHtml;
    document.querySelector('.search-suggestions').classList.add('active');

    // Add click handlers to suggestions
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            const selectedAirport = suggestions[index];
            if (selectedAirport) {
                handleAirportSelection(selectedAirport);
            }
        });
    });
}

function hideSuggestions() {
    const suggestionsDiv = document.querySelector('.search-suggestions');
    if (suggestionsDiv) {
        suggestionsDiv.classList.remove('active');
    }
}

function fuzzyMatch(pattern, str) {
    pattern = pattern.toLowerCase().replace(/\s+/g, '');
    str = str.toLowerCase().replace(/\s+/g, '');
    
    let patternIdx = 0;
    let strIdx = 0;
    let matches = [];
    
    while (patternIdx < pattern.length && strIdx < str.length) {
        if (pattern[patternIdx] === str[strIdx]) {
            matches.push(strIdx);
            patternIdx++;
        }
        strIdx++;
    }
    
    if (patternIdx === pattern.length) {
        let score = matches.length / str.length;
        if (matches[0] === 0) score += 0.2;
        return { match: true, score: score };
    }
    
    return { match: false, score: 0 };
}

function searchAirports(query) {
    if (!airportsLoaded || !window.airports || window.airports.length === 0) {
        console.warn('Airports data not yet loaded');
        return [];
    }

    if (!query || query.length < 2) return [];
    
    return window.airports
        .map(airport => {
            const nameMatch = fuzzyMatch(query, airport.name);
            const cityMatch = fuzzyMatch(query, airport.city);
            const iataMatch = fuzzyMatch(query, airport.iata);
            const countryMatch = fuzzyMatch(query, airport.country);
            
            const bestScore = Math.max(
                nameMatch.score,
                cityMatch.score,
                iataMatch.score * 1.2,
                countryMatch.score
            );
            
            return {
                ...airport,
                score: bestScore
            };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

function performSearch(query) {
    // If query is an airport object (from suggestion click)
    if (typeof query === 'object') {
        handleAirportSelection(query);
        return;
    }

    // If query is a string (from manual input)
    if (typeof query === 'string' && query.length >= 2) {
        const results = searchAirports(query);
        if (results.length > 0) {
            handleAirportSelection(results[0]);
        }
    }
}

function handleAirportSelection(airport) {
    if (!airport || !airport.country) return;

    // Update search input
    document.getElementById('search').value = `${airport.city} (${airport.iata})`;

    // Find and highlight the country
    if (geojsonLayer) {
        geojsonLayer.eachLayer(layer => {
            if (layer.feature.properties.ADMIN === airport.country) {
                map.fitBounds(layer.getBounds());
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
    
    hideSuggestions();
}

function initializeSearch() {
    if (!document.querySelector('.search-suggestions')) {
        createSearchSuggestions();
    }
    
    const searchInput = document.getElementById('search');
    if (!searchInput) return;

    // Remove any existing listeners
    searchInput.removeEventListener('input', handleSearchInput);
    searchInput.removeEventListener('keydown', handleSearchKeydown);

    // Add listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
}

// Remove automatic search on input, only show suggestions
function handleSearchInput(e) {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            currentSuggestions = searchAirports(query);
            showSuggestions(currentSuggestions);
        } else {
            hideSuggestions();
        }
    }, 200);
}

// Update keyboard navigation
function handleSearchKeydown(e) {
    const suggestionsDiv = document.querySelector('.search-suggestions');
    const items = suggestionsDiv.querySelectorAll('.suggestion-item');
    const activeItem = suggestionsDiv.querySelector('.suggestion-item.active');
    const activeIndex = Array.from(items).indexOf(activeItem);

    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (activeItem) {
                const nextIndex = (activeIndex + 1) % items.length;
                activeItem.classList.remove('active');
                items[nextIndex].classList.add('active');
                items[nextIndex].scrollIntoView({ block: 'nearest' });
            } else if (items.length > 0) {
                items[0].classList.add('active');
                items[0].scrollIntoView({ block: 'nearest' });
            }
            break;

        case 'ArrowUp':
            e.preventDefault();
            if (activeItem) {
                const prevIndex = (activeIndex - 1 + items.length) % items.length;
                activeItem.classList.remove('active');
                items[prevIndex].classList.add('active');
                items[prevIndex].scrollIntoView({ block: 'nearest' });
            } else if (items.length > 0) {
                items[items.length - 1].classList.add('active');
                items[items.length - 1].scrollIntoView({ block: 'nearest' });
            }
            break;

        case 'Enter':
            e.preventDefault();
            if (activeItem) {
                const index = parseInt(activeItem.dataset.index);
                if (currentSuggestions[index]) {
                    handleAirportSelection(currentSuggestions[index]);
                }
            }
            break;

        case 'Escape':
            hideSuggestions();
            break;
    }
}

// Update onAirportsLoaded to properly initialize search after data is loaded
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
        
        // Initialize search after data is loaded
        initializeSearch();
        
    } catch (error) {
        console.error('Error processing airport data:', error);
        window.airports = [];
        airportsLoaded = false;
    }
}

// Make sure these are available globally
window.initializeSearch = initializeSearch;
window.onAirportsLoaded = onAirportsLoaded;
