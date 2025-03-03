// State variables
let geojsonLayer;
let currentRiskFilter = 'all';
let airports = [];
let isBottomUIExpanded = false;
let map;

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initializeEventListeners();
    loadAirportsData();
    initializeDarkMode();
});

function initializeEventListeners() {
    // Add all event listeners from the original script.js
    const searchInput = document.getElementById('search');
    const searchBtn = document.getElementById('searchBtn');
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(this.value.trim());
        }
    });

    searchBtn.addEventListener('click', () => performSearch(searchInput.value.trim()));
    
    document.querySelectorAll('.risk-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.risk-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterCountries(this.getAttribute('data-risk'));
        });
    });

    document.getElementById('resetZoom').addEventListener('click', () => {
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

function loadAirportsData() {
    fetch('https://raw.githubusercontent.com/algolia/datasets/master/airports/airports.json')
        .then(response => response.json())
        .then(data => {
            airports = data
                .filter(airport => 
                    airport?.location?.lat && 
                    airport?.location?.lng &&
                    airport.name &&
                    airport.city &&
                    airport.country &&
                    airport.iata_code
                )
                .map(airport => ({
                    name: airport.name,
                    city: airport.city,
                    country: airport.country,
                    iata: airport.iata_code,
                    coordinates: [airport.location.lat, airport.location.lng]
                }));
        })
        .catch(error => {
            console.error('Error loading airports:', error);
            airports = [];
        });
}
