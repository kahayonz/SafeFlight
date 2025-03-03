function initMap() {
    map = L.map('map', {
        minZoom: 3,
        maxZoom: 8,
        maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
        maxBoundsViscosity: 1.0,
        wheelDebounceTime: 150,
        wheelPxPerZoomLevel: 120,
        preferCanvas: true,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        bounceAtZoomLimits: false,
        worldCopyJump: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        zoomAnimation: true,
        renderer: L.canvas({
            padding: 0.5,
            tolerance: 10
        })
    }).setView([20, 0], 3);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        maxZoom: 19,
        keepBuffer: 2,
        updateWhenIdle: true,
        updateWhenZooming: false
    }).addTo(map);

    loadGeoJSON();
}

function loadGeoJSON() {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
        .then(response => response.json())
        .then(data => {
            data.features.forEach(feature => {
                feature.properties.riskLevel = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
                feature.properties.disease = 'Sample Disease';
                feature.properties.cases = Math.floor(Math.random() * 1000);
            });

            geojsonLayer = L.geoJSON(data, {
                style: (feature) => getCountryStyle(feature.properties.riskLevel),
                onEachFeature: onEachFeature,
                smoothFactor: 1.5,
                bubblingMouseEvents: false
            }).addTo(map);

            filterCountries('all');
        });
}

// Map styles and utilities
function getCountryStyle(riskLevel) {
    return {
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: {
            high: '#ff4444',
            medium: '#ffa726',
            low: '#66bb6a'
        }[riskLevel] || '#90a4ae'
    };
}

// Map interaction handlers
function onEachFeature(feature, layer) {
    layer.bindTooltip(feature.properties.ADMIN || feature.properties.name, {
        permanent: false,
        direction: 'center',
        className: 'country-label',
        opacity: 0.8,
        sticky: true,
        offset: [0, 0],
        interactive: false
    });

    layer.on({
        click: onFeatureClick
    });
}

function onFeatureClick(e) {
    map.fitBounds(e.target.getBounds());
    updateInfoPanel(e.target.feature.properties);
}

function filterCountries(riskLevel) {
    if (!geojsonLayer) return;
    currentRiskFilter = riskLevel;
    
    geojsonLayer.eachLayer((layer) => {
        const countryRisk = layer.feature.properties.riskLevel;
        const styles = riskLevel === 'all' 
            ? { opacity: 1, fillOpacity: 0.7 }
            : countryRisk === riskLevel 
                ? { opacity: 1, fillOpacity: 0.9, weight: 2, color: '#666', dashArray: '' }
                : { opacity: 0.2, fillOpacity: 0.1, weight: 1, color: 'white', dashArray: '3' };
        
        layer.setStyle(styles);
    });
}

function updateInfoPanel(properties) {
    const countryName = properties.ADMIN || properties.name || 'Unknown';
    document.querySelector('.info-value.location').textContent = countryName;
    document.querySelector('.info-value.disease').textContent = properties.disease || 'No data';
    document.querySelector('.info-value.cases').textContent = properties.cases || '0';
    updateNewsPanel(countryName);
}

initMap();
