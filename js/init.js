window.state = {
    geojsonLayer: null,
    currentRiskFilter: 'all',
    isBottomUIExpanded: false,
    map: null
};

document.addEventListener('DOMContentLoaded', () => {
    if (!state.map) {
        initMap();
    }
    initializeAuth();
    initializeEventListeners();
    initializeTopUIHandle();
    initializeTopUIToggle();

    const infoPanel = document.querySelector('.info-panel');
    if (infoPanel) {
        const cdcDiv = infoPanel.querySelector('.cdc-nndss-summary');
        if (cdcDiv) cdcDiv.remove();
    }
});

function initializeEventListeners() {
    const elements = {
        search: document.getElementById('search'),
        searchBtn: document.getElementById('searchBtn'),
        resetZoom: document.getElementById('resetZoom'),
        riskButtons: document.querySelectorAll('.risk-btn')
    };

    if (!elements.search || !elements.searchBtn) {
        console.error('Search elements not found!');
        return;
    }

    const handlers = {
        search: (e) => e.key === 'Enter' && performSearch(e.target.value.trim()),
        searchBtn: () => elements.search.value && performSearch(elements.search.value.trim()),
        risk: (btn) => {
            elements.riskButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterCountries(btn.getAttribute('data-risk'));
        },
        reset: () => {
            cleanupMarkers();
            if (window.state && window.state.map) {
                const minZoom = window.state.map.getMinZoom ? window.state.map.getMinZoom() : 2;
                window.state.map.setView([20, 0], minZoom);
            }
            resetInfoPanel();
        }
    };

    elements.search.addEventListener('keypress', handlers.search);
    elements.searchBtn.addEventListener('click', handlers.searchBtn);
    elements.riskButtons.forEach(btn => btn.addEventListener('click', () => handlers.risk(btn)));
    elements.resetZoom.addEventListener('click', handlers.reset);

    initializeBottomUIHandlers();
    initializeDarkMode();
}

function cleanupMarkers() {
    if (state.geojsonLayer) {
        state.geojsonLayer.eachLayer(layer => {
            state.geojsonLayer.resetStyle(layer);
        });
    }
    if (window.currentMarker) {
        state.map.removeLayer(window.currentMarker);
        window.currentMarker = null;
    }
}

function initializeBottomUIHandlers() {
    const bottomUI = document.querySelector('.bottom-ui');
    const bottomUIHandle = document.querySelector('.bottom-ui-handle');
    let startY, startHeight;

    window.state.isBottomUIExpanded = bottomUI.classList.contains('expanded');

    bottomUIHandle.addEventListener('click', () => {
        window.state.isBottomUIExpanded = !window.state.isBottomUIExpanded;
        bottomUI.classList.toggle('expanded', window.state.isBottomUIExpanded);

        if (window.state.isBottomUIExpanded) {
            const currentLocation = document.querySelector('.info-value.location').textContent;
            if (currentLocation && currentLocation !== 'Select area') {
                updateNewsPanel(currentLocation);
                showCdcSummaryIfUS();
            }
        } else {
            showCdcSummaryIfUS();
        }
    });

    bottomUIHandle.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const diff = startY - touch.clientY;
        const newHeight = Math.min(Math.max(startHeight + diff, 100), window.innerHeight * 0.9);
        bottomUI.style.height = `${newHeight}px`;

        const isExpanded = newHeight > window.innerHeight * 0.3;
        bottomUI.classList.toggle('expanded', isExpanded);

        if (isExpanded !== window.state.isBottomUIExpanded) {
            window.state.isBottomUIExpanded = isExpanded;
            if (isExpanded) {
                const currentLocation = document.querySelector('.info-value.location').textContent;
                if (currentLocation && currentLocation !== 'Select area') {
                    updateNewsPanel(currentLocation);
                    showCdcSummaryIfUS();
                }
            }
        }
    });

    bottomUIHandle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        startHeight = document.querySelector('.bottom-ui').offsetHeight;
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

        if (state.currentRiskFilter !== 'all') {
            filterCountries(state.currentRiskFilter);
        }

        if (state.map) {
            state.map.eachLayer(layer => {
                if (layer instanceof L.TileLayer) layer.redraw();
            });
        }
    });
}

function resetInfoPanel() {
    const elements = {
        location: document.querySelector('.info-value.location'),
        disease: document.querySelector('.info-value.disease'),
        cases: document.querySelector('.info-value.cases')
    };

    elements.location.textContent = 'Select area';
    elements.disease.textContent = '-';
    elements.cases.textContent = '-';

    if (state.isBottomUIExpanded) {
        const newsContainer = document.querySelector('.news-container');
        if (newsContainer) {
            newsContainer.innerHTML = '<div class="news-item"><p>Select a country to view health alerts.</p></div>';
        }
    }
    showCdcSummaryIfUS();
}

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
            loadBackupAirportData();
        });
}

function loadBackupAirportData() {
    console.log('Loading backup airport data...');
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

    ];

    onAirportsLoaded(backupData);
    console.log('Loaded backup airports:', backupData.length);
}

function showCdcSummaryIfUS() {
    const currentLocation = document.querySelector('.info-value.location').textContent;
    if ((currentLocation === 'United States' || currentLocation === 'United States of America') && window.state.isBottomUIExpanded) {
        if (window.fetchAndDisplayNNDSSummary) {
            window.fetchAndDisplayNNDSSummary(true);
        } else if (typeof fetchAndDisplayNNDSSummary === 'function') {
            fetchAndDisplayNNDSSummary(true);
        }
    } else {
        let infoPanel = document.querySelector('.info-panel');
        if (infoPanel) {
            let cdcDiv = infoPanel.querySelector('.cdc-nndss-summary');
            if (cdcDiv) cdcDiv.remove();
        }
    }
}

function initializeTopUIHandle() {
    const topUI = document.querySelector('.top-ui');
    const topUIHandle = document.querySelector('.top-ui-handle');
    if (!topUI || !topUIHandle) return;

    topUI.classList.add('expanded');
    topUI.classList.remove('collapsed');

    topUIHandle.addEventListener('click', () => {
        const isCollapsed = topUI.classList.contains('collapsed');
        topUI.classList.toggle('collapsed', !isCollapsed);
        topUI.classList.toggle('expanded', isCollapsed);

        if (!isCollapsed) {
            if (!document.querySelector('.top-ui-vertical-handle')) {
                const verticalHandle = document.createElement('div');
                verticalHandle.className = 'top-ui-vertical-handle';
                verticalHandle.title = 'Show menu';
                verticalHandle.innerHTML = `<div class="vertical-bar"></div>`;
                verticalHandle.onclick = () => {
                    topUI.classList.remove('collapsed');
                    topUI.classList.add('expanded');
                    verticalHandle.remove();
                };
                document.body.appendChild(verticalHandle);
            }
            document.body.classList.add('top-ui-locked');
            document.documentElement.classList.add('top-ui-locked');
        } else {
            const onTransitionEnd = () => {
                document.body.classList.remove('top-ui-locked');
                document.documentElement.classList.remove('top-ui-locked');
                topUI.removeEventListener('transitionend', onTransitionEnd);
            };
            topUI.addEventListener('transitionend', onTransitionEnd);
        }
    });
}

function initializeTopUIToggle() {
    const topUI = document.getElementById('topUI');
    const toggleBtn = document.getElementById('topUIToggleBtn');
    if (!topUI || !toggleBtn) return;

    topUI.classList.add('expanded');
    topUI.classList.remove('collapsed');

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = topUI.classList.contains('collapsed');
        topUI.classList.toggle('collapsed', !isCollapsed);
        topUI.classList.toggle('expanded', isCollapsed);

        if (!isCollapsed) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
}
