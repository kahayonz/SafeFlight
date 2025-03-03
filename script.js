// Initialize the map with additional performance optimizations
const map = L.map('map', {
    minZoom: 3,
    maxZoom: 8, // Limit max zoom for better performance
    maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
    maxBoundsViscosity: 1.0,
    wheelDebounceTime: 150,
    wheelPxPerZoomLevel: 120,
    preferCanvas: true, // Use Canvas renderer for better performance
    zoomSnap: 0.5, // Smoother zooming
    zoomDelta: 0.5,
    bounceAtZoomLimits: false, // Prevent bouncing at zoom limits
    worldCopyJump: true, // Smoother panning across date line
    fadeAnimation: true,
    markerZoomAnimation: true,
    zoomAnimation: true,
    renderer: L.canvas({
        padding: 0.5,
        tolerance: 10
    })
}).setView([20, 0], 3);

// Add OpenStreetMap tiles with loading indicator
const loadingIndicator = document.getElementById('map-loading');
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '©OpenStreetMap, ©CartoDB',
    maxZoom: 19,
    keepBuffer: 2,
    updateWhenIdle: true,
    updateWhenZooming: false
}).addTo(map);

// Create a GeoJSON layer
let geojsonLayer;
let currentRiskFilter = 'all';

// Style for countries
function getCountryStyle(riskLevel) {
    const baseStyle = {
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };

    switch(riskLevel) {
        case 'high':
            baseStyle.fillColor = '#ff4444';
            break;
        case 'medium':
            baseStyle.fillColor = '#ffa726';
            break;
        case 'low':
            baseStyle.fillColor = '#66bb6a';
            break;
        default:
            baseStyle.fillColor = '#90a4ae';
    }

    return baseStyle;
}

// Modify the highlight function to only work on click
function highlightFeature(e) {
    if (currentRiskFilter !== 'all') return;
    
    const layer = e.target;
    layer.setStyle({
        weight: 2,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.9
    });
}

// click handler
function onFeatureClick(e) {
    map.fitBounds(e.target.getBounds());
    updateInfoPanel(e.target.feature.properties);
}

// country layer listeners
function onEachFeature(feature, layer) {
    // Add tooltip with improved options
    layer.bindTooltip(feature.properties.ADMIN || feature.properties.name, {
        permanent: false,
        direction: 'center',
        className: 'country-label',
        opacity: 0.8,
        sticky: true, // Makes tooltip follow the mouse
        offset: [0, 0],
        interactive: false // Prevents tooltip from interfering with events
    });

    layer.on({
        click: function(e) {
            if (geojsonLayer) {
                geojsonLayer.eachLayer(l => {
                    geojsonLayer.resetStyle(l);
                });
            }
            highlightFeature(e);
            onFeatureClick(e);
        }
    });
}

// Update info panel with country data
function updateInfoPanel(properties) {
    const countryName = properties.ADMIN || properties.name || 'Unknown';
    document.querySelector('.info-value.location').textContent = countryName;
    document.querySelector('.info-value.disease').textContent = properties.disease || 'No data';
    document.querySelector('.info-value.cases').textContent = properties.cases || '0';
}

// Add this function before the fetch call
function filterCountries(riskLevel) {
    if (!geojsonLayer) return;
    
    currentRiskFilter = riskLevel;
    
    geojsonLayer.eachLayer((layer) => {
        const countryRisk = layer.feature.properties.riskLevel;
        
        if (riskLevel === 'all') {
            layer.setStyle({
                opacity: 1,
                fillOpacity: 0.7
            });
            geojsonLayer.resetStyle(layer);
        } else {
            if (countryRisk === riskLevel) {
                layer.setStyle({
                    opacity: 1,
                    fillOpacity: 0.9,
                    weight: 2,
                    color: '#666',
                    dashArray: ''
                });
            } else {
                layer.setStyle({
                    opacity: 0.2,
                    fillOpacity: 0.1,
                    weight: 1,
                    color: 'white',
                    dashArray: '3'
                });
            }
        }
    });
}

// Add these functions after the existing declarations
const AIRLINE_CODES = {
    'AA': 'American Airlines',
    'UA': 'United Airlines',
    'DL': 'Delta Airlines',
    'LH': 'Lufthansa',
    'BA': 'British Airways',
    'AF': 'Air France',
    'KL': 'KLM',
    // Add more airlines as needed
};

// Simple flight route database (replace with actual API in production)
const FLIGHT_ROUTES = {
    'AA123': { destination: 'United States', airport: 'JFK' },
    'BA456': { destination: 'United Kingdom', airport: 'LHR' },
    'LH789': { destination: 'Germany', airport: 'FRA' },
    // Add more routes as needed
};

// Add this after the FLIGHT_ROUTES constant
const MAJOR_CITIES = {
    'London': 'United Kingdom',
    'Paris': 'France',
    'New York': 'United States',
    'Tokyo': 'Japan',
    'Beijing': 'China',
    'Sydney': 'Australia',
    'Dubai': 'United Arab Emirates',
    'Moscow': 'Russia',
    'Berlin': 'Germany',
    'Rome': 'Italy',
    // Add more cities as needed
};

function parseFlightNumber(input) {
    // Match pattern: 2-3 letters followed by 1-4 numbers
    const match = input.toUpperCase().match(/^([A-Z]{2,3})(\d{1,4})$/);
    if (!match) return null;

    const [_, airlineCode, flightNumber] = match;
    const airline = AIRLINE_CODES[airlineCode];
    const route = FLIGHT_ROUTES[input.toUpperCase()];

    if (!airline || !route) return null;

    return {
        airline,
        flightNumber,
        destination: route.destination,
        airport: route.airport
    };
}

// Add this function after parseFlightNumber
let locationData = null;

// Fetch location data
fetch('data/locations.json')
    .then(response => response.json())
    .then(data => {
        locationData = data;
    })
    .catch(error => console.error('Error loading location data:', error));

// Update the searchLocation function
function searchLocation(input) {
    // First check if it's a flight number
    const flightInfo = parseFlightNumber(input);
    if (flightInfo) {
        return {
            type: 'flight',
            data: flightInfo
        };
    }

    if (!locationData) return { type: 'country', data: input };

    // Check cities
    const cityMatch = Object.entries(locationData.cities).find(([city]) => 
        city.toLowerCase().includes(input.toLowerCase())
    );
    if (cityMatch) {
        return {
            type: 'city',
            data: {
                city: cityMatch[0],
                ...cityMatch[1]
            }
        };
    }

    // Check countries
    const countryMatch = Object.entries(locationData.countries).find(([country]) => 
        country.toLowerCase().includes(input.toLowerCase())
    );
    if (countryMatch) {
        return {
            type: 'country',
            data: {
                name: countryMatch[0],
                ...countryMatch[1]
            }
        };
    }

    return {
        type: 'search',
        data: input
    };
}

function highlightCountryByName(countryName) {
    geojsonLayer.eachLayer((layer) => {
        if (layer.feature.properties.ADMIN === countryName) {
            map.fitBounds(layer.getBounds());
            highlightFeature({ target: layer });
            return;
        }
    });
}

// Modify the geojson layer creation with performance options
fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
    .then(response => response.json())
    .then(data => {
        // Add sample disease data to properties (replace with your actual data)
        data.features.forEach(feature => {
            feature.properties.riskLevel = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
            feature.properties.disease = 'Sample Disease';
            feature.properties.cases = Math.floor(Math.random() * 1000);
        });

        geojsonLayer = L.geoJSON(data, {
            style: (feature) => getCountryStyle(feature.properties.riskLevel),
            onEachFeature: onEachFeature,
            smoothFactor: 1.5, // Simplify polygons
            bubblingMouseEvents: false // Reduce event overhead
        }).addTo(map);

        // Initialize with all risks visible
        filterCountries('all');
    });

// Loading indicator handlers
map.on('loading', function() {
    loadingIndicator.classList.add('active');
});

map.on('load', function() {
    loadingIndicator.classList.remove('active');
});

// Add debouncing to search input
let searchTimeout;
document.getElementById('search').addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const input = e.target.value.trim();
        if (input.length < 2) return;

        const searchResult = searchLocation(input);
        
        switch(searchResult.type) {
            case 'flight':
                highlightCountryByName(searchResult.data.destination);
                document.querySelector('.info-value.location').textContent = 
                    `${searchResult.data.destination} (${searchResult.data.airport})`;
                document.querySelector('.info-value.disease').textContent = 
                    `Flight: ${input.toUpperCase()}`;
                document.querySelector('.info-value.cases').textContent = 
                    searchResult.data.airline;
                break;

            case 'city':
                highlightCountryByName(searchResult.data.country);
                document.querySelector('.info-value.location').textContent = 
                    `${searchResult.data.city}, ${searchResult.data.country}`;
                // Center map on city coordinates
                if (searchResult.data.coordinates) {
                    map.setView(searchResult.data.coordinates, 8);
                }
                updateInfoPanelFromCountry(searchResult.data.country);
                break;

            case 'country':
                if (searchResult.data.coordinates) {
                    map.setView(searchResult.data.coordinates, 5);
                }
                highlightCountryByName(searchResult.data.name || searchResult.data);
                updateInfoPanelFromCountry(searchResult.data.name || searchResult.data);
                break;
        }
    }, 300);
});

// Add this helper function
function updateInfoPanelFromCountry(countryName) {
    if (geojsonLayer) {
        geojsonLayer.eachLayer((layer) => {
            if (layer.feature.properties.ADMIN === countryName) {
                updateInfoPanel(layer.feature.properties);
            }
        });
    }
}

// Replace the existing risk button event listeners with this:
const riskButtons = document.querySelectorAll('.risk-btn');
riskButtons.forEach(button => {
    button.addEventListener('click', function() {
        riskButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        const riskLevel = this.getAttribute('data-risk');
        currentRiskFilter = riskLevel;
        filterCountries(riskLevel);
    });
});

// Add reset zoom functionality
document.getElementById('resetZoom').addEventListener('click', function() {
    map.setView([20, 0], 3);
    // Reset any highlighted features
    if (geojsonLayer) {
        geojsonLayer.eachLayer((layer) => {
            geojsonLayer.resetStyle(layer);
        });
    }
    // Reset info panel
    document.querySelector('.info-value.location').textContent = 'Select area';
    document.querySelector('.info-value.disease').textContent = '-';
    document.querySelector('.info-value.cases').textContent = '-';
});

// Dark mode functionality
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

// Check for saved dark mode preference
const darkMode = localStorage.getItem('darkMode');
if (darkMode === 'enabled') {
    body.classList.add('dark-mode');
    darkModeToggle.querySelector('.mode-icon').textContent = '🌙';
}

darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    
    // Update icon
    darkModeToggle.querySelector('.mode-icon').textContent = isDarkMode ? '🌙' : '☀️';
    
    // Save preference
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');

    // Force map tiles to refresh for dark mode
    map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
            layer.redraw();
        }
    });
});
