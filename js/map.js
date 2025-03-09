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

async function loadGeoJSON(retryCount = 3) {
    const loadingEl = document.getElementById('map-loading');
    loadingEl.classList.add('active');
    loadingEl.textContent = 'Loading map data...';

    const PRIMARY_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
    const BACKUP_URL = 'https://datahub.io/core/geo-countries/r/countries.geojson';

    for (let i = 0; i < retryCount; i++) {
        try {
            const response = await fetch(i === 0 ? PRIMARY_URL : BACKUP_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (!data || !data.features) throw new Error('Invalid GeoJSON data');

            // filtering to risk levels
            data.features.forEach(feature => {
                feature.properties.riskLevel = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
                feature.properties.disease = 'Sample Disease';
                feature.properties.cases = Math.floor(Math.random() * 1000);
            });

            // geojson highlight layers
            geojsonLayer = L.geoJSON(data, {
                style: (feature) => getCountryStyle(feature.properties.riskLevel),
                onEachFeature: onEachFeature,
                bubblingMouseEvents: false
            }).addTo(map);

            filterCountries('all');
            loadingEl.classList.remove('active');
            return;

        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            loadingEl.textContent = `Retrying... (${i + 1}/${retryCount})`;
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 sec wait
        }
    }

    // if no workie, show error and enable manual retry
    loadingEl.innerHTML = `
        Failed to load map data. 
        <button onclick="loadGeoJSON()" class="retry-btn">Try Again</button>
    `;
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
    
    const highlightColor = document.body.classList.contains('dark-mode') ? '#fff' : '#000';
    
    geojsonLayer.eachLayer((layer) => {
        const countryRisk = layer.feature.properties.riskLevel;
        const styles = riskLevel === 'all' 
            ? { opacity: 1, fillOpacity: 0.7 }
            : countryRisk === riskLevel 
                ? { opacity: 1, fillOpacity: 0.9, weight: 2, color: highlightColor, dashArray: '' }
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
