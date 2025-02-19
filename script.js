// Initialize the map with performance optimizations
const map = L.map('map', {
    minZoom: 2,
    maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
    maxBoundsViscosity: 1.0,
    wheelDebounceTime: 150,
    wheelPxPerZoomLevel: 120
}).setView([20, 0], 2);

// Add OpenStreetMap tiles with loading indicator
const loadingIndicator = document.getElementById('map-loading');
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
    keepBuffer: 2,
    updateWhenIdle: true,
    updateWhenZooming: false
}).addTo(map);

// Create a marker cluster group
const markers = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true
});

// Loading indicator handlers
map.on('loading', function() {
    loadingIndicator.classList.add('active');
});

map.on('load', function() {
    loadingIndicator.classList.remove('active');
});

// Event Listeners for UI Elements
document.getElementById('search').addEventListener('input', function(e) {
  // Add search functionality here
  console.log('Searching for:', e.target.value);
});

// Risk button functionality
const riskButtons = document.querySelectorAll('.risk-btn');
riskButtons.forEach(button => {
  button.addEventListener('click', function() {
    riskButtons.forEach(btn => btn.classList.remove('active'));
    this.classList.add('active');
    const riskLevel = this.getAttribute('data-risk');
    console.log('Selected risk level:', riskLevel);
  });
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

// Example data points with clustering
const marker = L.marker([37.7749, -122.4194]);
markers.addLayer(marker);
marker.bindPopup(`
  <div class="popup-content">
    <div class="popup-title">Outbreak Detected</div>
    <div class="popup-location">San Francisco</div>
    <div class="popup-disease">Influenza</div>
    <div class="popup-cases">1500</div>
  </div>
`, {
    closeButton: true,
    closeOnClick: false,
    autoPan: true
});

const circle = L.circle([48.8566, 2.3522], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 500000
});
markers.addLayer(circle);
circle.bindPopup(`
  <div class="popup-content">
    <div class="popup-title">Outbreak Alert</div>
    <div class="popup-location">Paris</div>
    <div class="popup-disease">Dengue Fever</div>
    <div class="popup-cases">500</div>
  </div>
`, {
    closeButton: true,
    closeOnClick: false,
    autoPan: true
});

// Add marker cluster group to map
map.addLayer(markers);

// Update info panel when clicking on markers
function updateInfoPanel(content) {
    try {
        console.log('Raw popup content:', content); // Debug log

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        
        const location = doc.querySelector('.popup-location')?.textContent || 'Unknown';
        const disease = doc.querySelector('.popup-disease')?.textContent || 'Unknown';
        const cases = doc.querySelector('.popup-cases')?.textContent || '0';
        
        console.log('Parsed data:', { location, disease, cases }); // Debug log

        document.querySelector('.info-value.location').textContent = location;
        document.querySelector('.info-value.disease').textContent = disease;
        document.querySelector('.info-value.cases').textContent = cases;
    } catch (error) {
        console.error('Error updating info panel:', error);
        // Set default values if parsing fails
        document.querySelector('.info-value.location').textContent = 'Error loading';
        document.querySelector('.info-value.disease').textContent = 'Error loading';
        document.querySelector('.info-value.cases').textContent = 'Error loading';
    }
}

map.on('popupopen', function(e) {
  updateInfoPanel(e.popup._content);
});
