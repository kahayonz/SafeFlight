function initMap() {
    if (!window.state) {
        window.state = {};
    }

    // Remove existing map if present
    if (window.state.map) {
        window.state.map.remove();
        window.state.map = null;
    }

    // Set bounds to the visible world (hard border)
    const worldBounds = L.latLngBounds(
        L.latLng(-85, -180), // Southwest
        L.latLng(85, 180)    // Northeast
    );

    window.state.map = L.map('map', {
        center: [20, 0],
        zoom: 3,
        minZoom: 3,
        maxZoom: 8,
        preferCanvas: true,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        bounceAtZoomLimits: false, // Prevent bouncing at the edge
        wheelDebounceTime: 150,
        wheelPxPerZoomLevel: 120,
        fadeAnimation: true,
        markerZoomAnimation: true,
        zoomAnimation: true,
        renderer: L.canvas({
            padding: 0.5,
            tolerance: 10
        }),
        zoomControl: false,
        maxBounds: worldBounds,      // Hard border: can't scroll out of the map
        maxBoundsViscosity: 1.0      // 1.0 = hard limit, can't pan outside
    });

    // Add tile layer with no horizontal wrapping
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        maxZoom: 19,
        noWrap: true // Prevent infinite horizontal panning
    }).addTo(window.state.map);

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(window.state.map);

    loadGeoJSON();
}

async function loadGeoJSON(retryCount = 3) {
    const loadingEl = document.getElementById('map-loading');
    loadingEl.classList.add('active');
    loadingEl.textContent = 'Loading map data...';

    const PRIMARY_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
    const BACKUP_URL = 'https://datahub.io/core/geo-countries/r/countries.geojson';
    const HEALTH_API_URL = 'https://disease.sh/v3/covid-19/countries';

    // Fetch health data
    const healthResponse = await fetch(HEALTH_API_URL);
    if (!healthResponse.ok) throw new Error(`Health API error: ${healthResponse.status}`);
    const healthData = await healthResponse.json();

    // Map health data by ISO3, but add monthly cases (parallel fetch)
    const healthMap = {};
    await Promise.all(healthData.map(async (country) => {
        const iso3 = country.countryInfo.iso3;
        let monthlyCases = 0;
        try {
            monthlyCases = await getMonthlyCases(iso3); // Wait for real data, no timeout
        } catch (e) {
            monthlyCases = 0;
        }
        healthMap[iso3] = {
            cases: monthlyCases,
            deaths: country.todayDeaths,
            recovered: country.todayRecovered,
            totalCases: country.cases
        };
    }));

    // Debugging: Log health data mapping
    console.log('Health data mapping:', healthMap);

    for (let i = 0; i < retryCount; i++) {
        try {
            const response = await fetch(i === 0 ? PRIMARY_URL : BACKUP_URL);
            if (!response.ok) throw new Error(`GeoJSON error: ${response.status}`);

            const data = await response.json();
            if (!data || !data.features) throw new Error('Invalid GeoJSON data');

            // Update GeoJSON with health data and assign risk levels
            data.features.forEach(feature => {
                const isoCode = feature.properties['ISO3166-1-Alpha-3'];
                const healthData = healthMap[isoCode] || { cases: 0, deaths: 0, recovered: 0, totalCases: 0 };
                feature.properties.cases = healthData.cases;
                feature.properties.deaths = healthData.deaths;
                feature.properties.recovered = healthData.recovered;
                feature.properties.totalCases = healthData.totalCases;

                // Assign risk level based on daily cases
                if (healthData.cases > 10000) {
                    feature.properties.riskLevel = 'high';
                } else if (healthData.cases > 1000) {
                    feature.properties.riskLevel = 'medium';
                } else {
                    feature.properties.riskLevel = 'low';
                }

                // Debugging: Log each feature's properties
                console.log('Feature properties after update:', feature.properties);
            });

            // Remove previous layers if present
            if (window.state.geojsonLayers) {
                window.state.geojsonLayers.forEach(layer => window.state.map.removeLayer(layer));
            }

            // Prepare style and onEachFeature
            const style = (feature) => {
                const riskLevel = feature.properties.riskLevel;
                let fillColor;
                if (riskLevel === 'high') fillColor = '#ff4444';      // Red
                else if (riskLevel === 'medium') fillColor = '#ffa726'; // Orange
                else fillColor = '#66bb6a';                            // Green
                return {
                    fillColor,
                    weight: 1,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            };

            // Use your addWrappedGeoJsonLayer utility
            addWrappedGeoJsonLayer(data, style, onEachFeature);

            // For compatibility with existing code, set geojsonLayer to the original
            window.state.geojsonLayer = window.state.geojsonLayers[0];

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

//map styles and utilities
function getCountryStyle(riskLevel) {
    return {
        weight: 1.5,
        opacity: 0.8,
        color: '#fff',
        dashArray: '',
        fillOpacity: 0.7,
        fillColor: {
            high: '#ff4444',
            medium: '#ffa726',
            low: '#66bb6a'
        }[riskLevel] || '#90a4ae'
    };
}

// map interaction handlers
function onEachFeature(feature, layer) {
    // Use ADMIN or NAME_EN for English
    const englishName = feature.properties.ADMIN || feature.properties.NAME_EN || feature.properties.name;
    layer.bindTooltip(englishName, {
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
    // Reset all country styles first
    window.state.geojsonLayer.eachLayer(layer => {
        window.state.geojsonLayer.resetStyle(layer);
    });

    // Then highlight the selected country
    const layer = e.target;
    const bounds = layer.getBounds();
    const country = layer.feature.properties.ADMIN || layer.feature.properties.name;
    const cases = layer.feature.properties.cases || 0;
    const deaths = layer.feature.properties.deaths || 0;
    const recovered = layer.feature.properties.recovered || 0;

    layer.setStyle({
        weight: 2,
        color: document.body.classList.contains('dark-mode') ? '#fff' : '#000',
        fillOpacity: 0.9
    });

    // Update the info panel
    const elements = {
        location: document.querySelector('.info-value.location'),
        disease: document.querySelector('.info-value.disease'),
        cases: document.querySelector('.info-value.cases')
    };

    elements.location.textContent = country;
    elements.disease.textContent = 'COVID-19';
    elements.cases.textContent = `Cases this month: ${cases}`;

    // Adjust map bounds with a drastic zoom but keep the whole country in frame with extra space
    let fitBounds = bounds;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    // For USA, use custom bounds to exclude Alaska and Hawaii
    if (country === "United States of America" || country === "United States") {
        window.state.map.fitBounds([
            [24.396308, -125.000000], // Southwest point
            [49.384358, -66.934570]   // Northeast point
        ], {
            maxZoom: 4,
            padding: [120, 120], // Extra space
            animate: true,
            duration: 1.2
        });
        return;
    }

    // For countries crossing the dateline, adjust bounds
    const crossesDateLine = sw.lng > ne.lng;
    if (crossesDateLine) {
        fitBounds = L.latLngBounds(
            [sw.lat, sw.lng],
            [ne.lat, ne.lng + 360]
        );
    }

    // Drastic zoom: allow up to zoom 7, but always fit the whole country with extra padding
    window.state.map.fitBounds(fitBounds, {
        maxZoom: 7,
        padding: [120, 120], // Extra space around the country
        animate: true,
        duration: 1.2
    });
}

function filterCountries(riskLevel) {
    if (!window.state.geojsonLayers) return;
    window.state.currentRiskFilter = riskLevel;

    window.state.geojsonLayers.forEach(layerGroup => {
        layerGroup.eachLayer((layer) => {
            const countryRisk = layer.feature.properties.riskLevel;
            // Always reset to default style first to clear any previous highlight
            layerGroup.resetStyle(layer);

            // Now apply highlight if needed
            if (riskLevel !== 'all' && countryRisk === riskLevel) {
                const highlightColor = document.body.classList.contains('dark-mode') ? '#fff' : '#000';
                layer.setStyle({
                    opacity: 1,
                    fillOpacity: 0.9,
                    weight: 2,
                    color: highlightColor,
                    dashArray: ''
                });
            } else if (riskLevel !== 'all') {
                layer.setStyle({
                    opacity: 0.2,
                    fillOpacity: 0.1,
                    weight: 1,
                    color: 'white',
                    dashArray: '3'
                });
            }
            // If 'all', the resetStyle above is enough (default color restored)
        });
    });
}

// Patch: Only show CDC NNDSS summary when US is selected AND news panel is expanded
// Remove CDC summary from updateInfoPanel
function updateInfoPanel(properties) {
    const countryName = properties.ADMIN || properties.name || 'Unknown';
    document.querySelector('.info-value.location').textContent = countryName;
    document.querySelector('.info-value.disease').textContent = 'COVID-19';
    document.querySelector('.info-value.cases').textContent = `Cases this month: ${properties.cases}`;
    updateNewsPanel(countryName);
}

async function loadHealthEvents() {
    const API_URL = 'https://disease.sh/v3/covid-19/countries'; // Example API for health data

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const healthData = await response.json();

        // Instead of creating markers, map the data to the GeoJSON layer or info panel
        const healthMap = {};
        healthData.forEach(event => {
            healthMap[event.countryInfo.iso3] = {
                cases: event.cases,
                deaths: event.deaths,
                recovered: event.recovered
            };
        });

        // Update GeoJSON layer or info panel with this data
        // (This logic should already exist in loadGeoJSON or similar functions)
    } catch (error) {
        console.error('Failed to load health events:', error);
    }
}

// Fetches NNDSS Weekly Data (JSON, 1000 row limit) from CDC API
async function fetchNNDSSJson() {
    // CDC NNDSS Weekly Data JSON endpoint (1000 row limit)
    const CDC_API_URL = "https://data.cdc.gov/resource/x9gk-5huc.json?$limit=1000";
    try {
        const response = await fetch(CDC_API_URL);
        if (!response.ok) throw new Error(`CDC JSON API error: ${response.status}`);
        const data = await response.json();
        if (!data.length) {
            console.warn('No data found in CDC JSON response');
            return null;
        }
        // Log the first row for inspection
        console.log('CDC NNDSS JSON sample row:', data[0]);
        // You can process or display this data as needed
        return data;
    } catch (error) {
        console.error('Failed to fetch CDC NNDSS JSON:', error);
        return null;
    }
}

// Example usage: fetch and log CDC NNDSS JSON on map load
fetchNNDSSJson().then(data => {
    if (data) {
        console.log('CDC NNDSS JSON (first 1000 rows):', data);
        // You can process or display this data as needed
    }
});

// Fetches NNDSS Weekly Data (JSON, 1000 row limit) from CDC API and summarizes by disease
async function fetchAndDisplayNNDSSSummary(onlyUS = false) {
    const CDC_API_URL = "https://data.cdc.gov/resource/x9gk-5huc.json?$limit=1000";
    try {
        const response = await fetch(CDC_API_URL);
        if (!response.ok) throw new Error(`CDC JSON API error: ${response.status}`);
        const data = await response.json();
        if (!data.length) {
            console.warn('No data found in CDC JSON response');
            return;
        }
        // Use 'year' and 'week' fields (not mmwr_year/mmwr_week)
        const validRows = data.filter(row => row.year && row.week && (!onlyUS || row.states === 'US RESIDENTS'));
        if (!validRows.length) {
            console.warn('No valid rows with year and week');
            return;
        }
        const latest = validRows.reduce((acc, row) => {
            const year = parseInt(row.year);
            const week = parseInt(row.week);
            if (!acc) return { year, week };
            if (year > acc.year || (year === acc.year && week > acc.week)) {
                return { year, week };
            }
            return acc;
        }, null);
        const latestYear = latest.year;
        const latestWeek = latest.week;
        // Filter for latest week only
        const latestData = validRows.filter(row => parseInt(row.year) === latestYear && parseInt(row.week) === latestWeek);
        // Summarize by disease (label)
        const summary = {};
        latestData.forEach(row => {
            const disease = row.label || 'Other';
            // Use m2 as the case count (as seen in sample row)
            const count = parseInt(row.m2) || 0;
            if (!summary[disease]) summary[disease] = 0;
            summary[disease] += count;
        });
        // Remove 'Other' if count is 0
        if (summary['Other'] === 0) delete summary['Other'];
        // Sort by count descending
        const sorted = Object.entries(summary).sort((a, b) => b[1] - a[1]);
        // Build HTML for info panel: show top 2 diseases only
        let html = `<div style='margin-top:8px;'><strong>CDC NNDSS (Week ${latestWeek}, ${latestYear})</strong></div><ul style='max-height:60px;overflow:auto;padding-left:18px;'>`;
        sorted.slice(0, 2).forEach(([disease, count]) => {
            html += `<li><strong>${disease}:</strong> ${count}</li>`;
        });
        html += '</ul>';
        // Insert under the disease info, but add extra margin-top to push it lower as a workaround
        let diseaseValue = document.querySelector('.info-value.disease');
        if (diseaseValue) {
            let cdcDiv = diseaseValue.parentElement.querySelector('.cdc-nndss-summary');
            if (!cdcDiv) {
                cdcDiv = document.createElement('div');
                cdcDiv.className = 'cdc-nndss-summary';
                diseaseValue.parentElement.appendChild(cdcDiv);
            }
            cdcDiv.innerHTML = html;
            cdcDiv.style.marginTop = '40px'; // Push CDC summary lower as a workaround
        }
    } catch (error) {
        console.error('Failed to fetch or display CDC NNDSS JSON:', error);
    }
}

// Shift all coordinates of a feature by given degrees longitude
function shiftFeatureLongitude(feature, shift) {
    const newFeature = JSON.parse(JSON.stringify(feature));
    function shiftCoords(coords) {
        return coords.map(c =>
            Array.isArray(c[0])
                ? shiftCoords(c)
                : [c[0] + shift, c[1]]
        );
    }
    if (newFeature.geometry.type === "Polygon") {
        newFeature.geometry.coordinates = shiftCoords(newFeature.geometry.coordinates);
    } else if (newFeature.geometry.type === "MultiPolygon") {
        newFeature.geometry.coordinates = newFeature.geometry.coordinates.map(shiftCoords);
    }
    return newFeature;
}

// Call after map loads
initMap();
loadHealthEvents();
fetchAndDisplayNNDSSSummary();

// Replace addWrappedGeoJsonLayer with a single-world version
function addWrappedGeoJsonLayer(data, style, onEachFeature) {
    // Remove previous layers if present
    if (window.state.geojsonLayers) {
        window.state.geojsonLayers.forEach(layer => window.state.map.removeLayer(layer));
    }

    // Only add the original world (no wrapping)
    const original = L.geoJSON(data, { style, onEachFeature }).addTo(window.state.map);

    window.state.geojsonLayers = [original];
    window.state.geojsonLayer = original;
}

async function getMonthlyCases(iso3) {
    try {
        const res = await fetch(`https://disease.sh/v3/covid-19/historical/${iso3}?lastdays=31`);
        if (!res.ok) return 0; // No console.error here
        const data = await res.json();
        if (!data.timeline || !data.timeline.cases) return 0;
        const casesArr = Object.values(data.timeline.cases);
        let monthlyCases = 0;
        for (let i = 1; i < casesArr.length; i++) {
            monthlyCases += Math.max(0, casesArr[i] - casesArr[i - 1]);
        }
        return monthlyCases;
    } catch (e) {
        // Optionally, log only if not a 404
        // if (!e.message.includes('404')) console.error(e);
        return 0;
    }
}
