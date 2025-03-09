// initialize variables
let geojsonLayer;
let currentRiskFilter = 'all';
let isBottomUIExpanded = false;
let map;

// Initialize everything when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!map) { // Add check to prevent double initialization
        initMap();
    }
    initializeEventListeners();
    loadAirportsData();
});

function initializeEventListeners() {
    const searchInput = document.getElementById('search');
    const searchBtn = document.getElementById('searchBtn');
    
    if (!searchInput || !searchBtn) {
        console.error('Search elements not found!');
        return;
    }

    searchInput.addEventListener('input', function(e) {
        if (this.value.length >= 2) {
            performSearch(this.value.trim());
        }
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(this.value.trim());
        }
    });

    searchBtn.addEventListener('click', function() {
        const query = searchInput.value.trim();
        if (query) {
            performSearch(query);
        }
    });
    
    document.querySelectorAll('.risk-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.risk-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterCountries(this.getAttribute('data-risk'));
        });
    });

    document.getElementById('resetZoom').addEventListener('click', () => {
        cleanupMarkers();
        map.setView([20, 0], 3);
        if (geojsonLayer) {
            geojsonLayer.eachLayer(layer => geojsonLayer.resetStyle(layer));
        }
        if (window.currentMarker) {
            map.removeLayer(window.currentMarker);
        }
        resetInfoPanel();
    });

    initializeBottomUIHandlers();
    initializeDarkMode();
}

function cleanupMarkers() {
    // Reset all country styles
    if (geojsonLayer) {
        geojsonLayer.eachLayer(layer => {
            geojsonLayer.resetStyle(layer);
        });
    }
    if (window.currentMarker) {
        map.removeLayer(window.currentMarker);
        window.currentMarker = null;
    }
}

function initializeBottomUIHandlers() {
    const bottomUIHandle = document.querySelector('.bottom-ui-handle');
    let startY, startHeight;

    bottomUIHandle.addEventListener('click', () => {
        const bottomUI = document.querySelector('.bottom-ui');
        isBottomUIExpanded = !isBottomUIExpanded;
        bottomUI.classList.toggle('expanded', isBottomUIExpanded);
    });

    bottomUIHandle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        startHeight = document.querySelector('.bottom-ui').offsetHeight;
    });

    bottomUIHandle.addEventListener('touchmove', (e) => {
        const bottomUI = document.querySelector('.bottom-ui');
        const touch = e.touches[0];
        const diff = startY - touch.clientY;
        
        const newHeight = Math.min(Math.max(startHeight + diff, 100), window.innerHeight * 0.9);
        bottomUI.style.height = `${newHeight}px`;
        
        bottomUI.classList.toggle('expanded', newHeight > window.innerHeight * 0.3);
    });
}

function initializeDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    if (localStorage.getItem('darkMode') === 'enabled') {
        body.classList.add('dark-mode');
        darkModeToggle.querySelector('.mode-icon').textContent = '🌙';
    }

    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        darkModeToggle.querySelector('.mode-icon').textContent = isDarkMode ? '🌙' : '☀️';
        localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
        
        // Update country highlights when dark mode changes
        if (currentRiskFilter !== 'all') {
            filterCountries(currentRiskFilter);
        }
        
        if (map) {
            map.eachLayer(layer => {
                if (layer instanceof L.TileLayer) layer.redraw();
            });
        }
    });
}

function resetInfoPanel() {
    document.querySelector('.info-value.location').textContent = 'Select area';
    document.querySelector('.info-value.disease').textContent = '-';
    document.querySelector('.info-value.cases').textContent = '-';
}

/*airport location for search*/
function loadAirportsData() {
    console.log('Starting airport data load...');
    fetch('https://raw.githubusercontent.com/algolia/datasets/master/airports/airports.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Raw airport data:', data.length, 'entries');
            const validAirports = data.filter(airport => {
                const isValid = airport && 
                    airport.name &&
                    airport.city &&
                    airport.country &&
                    airport.iata_code &&
                    airport._geoloc &&
                    !isNaN(airport._geoloc.lat) &&
                    !isNaN(airport._geoloc.lng);
                
                if (!isValid) {
                    console.log('Invalid airport entry:', airport);
                }
                return isValid;
            });
            
            console.log('Filtered valid airports:', validAirports.length);
            
            if (validAirports.length === 0) {
                throw new Error('No valid airports found in the data');
            }
            
            onAirportsLoaded(validAirports);
        })
        .catch(error => {
            console.error('Error loading airports:', error);
            // Try backup data source
            loadBackupAirportData();
        });
}

function loadBackupAirportData() {
    console.log('Loading backup airport data...');
    // Minimal set of major airports as fallback
    const backupData = [
        {
            name: "London Heathrow Airport",
            city: "London",
            country: "United Kingdom",
            iata_code: "LHR",
            location: { lat: 51.4700, lng: -0.4543 }
        },
        {
            name: "John F Kennedy International Airport",
            city: "New York",
            country: "United States",
            iata_code: "JFK",
            location: { lat: 40.6413, lng: -73.7781 }
        },
        // Add more major airports as needed
    ];
    
    onAirportsLoaded(backupData);
    console.log('Loaded backup airports:', backupData.length);
}
