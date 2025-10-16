import { ApiService } from '../config/api.js';
import { AuthService } from '../utils/auth.js';
import { ViewTransition } from '../utils/view-transition.js';

export class MapView {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'view map-view';
    this.element.setAttribute('role', 'main');
    this.element.setAttribute('aria-label', 'Store Locations Map');
    this.map = null;
    this.markers = [];
    this.stories = [];
    this.tileLayers = {};
  }

  async render() {
    this.element.innerHTML = `
      <section class="map-section" aria-labelledby="map-title">
        <h1 id="map-title">Store Locations</h1>
        <p class="map-description">Find our stores and product locations on the map below.</p>
        
        <div class="map-controls">
          <div class="layer-controls">
            <label for="base-layer" class="control-label">Map Style:</label>
            <select id="base-layer" class="layer-select" aria-label="Select map style">
              <option value="osm">OpenStreetMap</option>
              <option value="satellite">Satellite</option>
            </select>
          </div>
          <button type="button" id="locate-btn" class="btn locate-btn" aria-label="Find my location">
            📍 My Location
          </button>
        </div>
        
        <div class="loading-spinner" id="map-loading" aria-live="polite">
          Loading map...
        </div>
        
        <div id="map" class="map-container" role="application" aria-label="Interactive map showing store locations">
          <!-- Map will be initialized here -->
        </div>
        
        <div class="map-legend" aria-label="Map legend">
          <h3>Legend</h3>
          <div class="legend-item">
            <span class="legend-marker default-marker"></span>
            <span>Store Location</span>
          </div>
          <div class="legend-item">
            <span class="legend-marker highlighted-marker"></span>
            <span>Selected Store</span>
          </div>
        </div>
      </section>
    `;

    // Initialize map after DOM is rendered
    setTimeout(() => {
      this.initializeMap();
    }, 100);

    await ViewTransition.fadeIn(this.element);
    return this.element;
  }

  async initializeMap() {
    const loadingSpinner = this.element.querySelector('#map-loading');
    const mapContainer = this.element.querySelector('#map');
    
    try {
      // Check if Leaflet is available
      if (typeof L === 'undefined') {
        throw new Error('Map library not loaded. Please check Leaflet script.');
      }

      // Ensure map container has height
      if (mapContainer.offsetHeight === 0) {
        mapContainer.style.height = '500px';
      }

      // Initialize map with Indonesia center
      this.map = L.map('map').setView([-2.5489, 118.0149], 5); // Center of Indonesia

      // Add tile layers
      this.tileLayers = {
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }),
        satellite: L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google',
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        })
      };

      // Add default layer
      this.tileLayers.osm.addTo(this.map);

      // Add layer control
      L.control.layers({
        "Street Map": this.tileLayers.osm,
        "Satellite": this.tileLayers.satellite
      }, {}, {
        position: 'topright'
      }).addTo(this.map);

      loadingSpinner.style.display = 'none';
      
      // Load stories after map is initialized
      await this.loadStories();
      this.attachMapEventListeners();
      
    } catch (error) {
      console.error('Error initializing map:', error);
      loadingSpinner.innerHTML = `Error loading map: ${error.message}. Please refresh the page.`;
      loadingSpinner.style.color = 'var(--error-color)';
    }
  }

  async loadStories() {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Please login to view store locations');
      }

      const response = await ApiService.getStories(token, 1); // Only get stories with location
      this.stories = response.listStory.filter(story => story.lat && story.lon);
      
      console.log('Loaded stories with location:', this.stories.length);
      
      if (this.stories.length > 0) {
        this.addMarkersToMap();
      } else {
        // Show message if no stories with location
        const mapContainer = this.element.querySelector('#map');
        L.popup()
          .setLatLng(this.map.getCenter())
          .setContent('<div class="map-popup"><p>No store locations available. Add products with location to see them here.</p></div>')
          .openOn(this.map);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
      
      // Show error on map
      if (this.map) {
        L.popup()
          .setLatLng(this.map.getCenter())
          .setContent(`<div class="map-popup error"><p>Error loading store locations: ${error.message}</p></div>`)
          .openOn(this.map);
      }
    }
  }

  addMarkersToMap() {
    // Clear existing markers
    this.markers.forEach(marker => {
      if (this.map && marker) {
        this.map.removeLayer(marker);
      }
    });
    this.markers = [];

    // Create bounds to fit all markers
    const bounds = [];

    this.stories.forEach((story, index) => {
      try {
        const marker = L.marker([story.lat, story.lon])
          .addTo(this.map)
          .bindPopup(`
            <div class="map-popup" role="dialog" aria-label="Store information">
              <h3>${this.escapeHtml(story.name)}</h3>
              <img src="${story.photoUrl}" alt="${this.escapeHtml(story.description)}" style="max-width: 200px; height: auto; border-radius: 4px;">
              <p>${this.escapeHtml(story.description)}</p>
              <p><small>Added: ${new Date(story.createdAt).toLocaleDateString()}</small></p>
              ${story.lat && story.lon ? `
                <p><small>Location: ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}</small></p>
              ` : ''}
            </div>
          `);

        // Add click event for highlighting
        marker.on('click', () => {
          this.highlightMarker(marker);
        });

        marker.on('popupopen', () => {
          this.highlightMarker(marker);
        });

        this.markers.push(marker);
        bounds.push([story.lat, story.lon]);
        
      } catch (error) {
        console.error('Error adding marker for story:', story.id, error);
      }
    });

    // Fit map to show all markers if we have any
    if (bounds.length > 0) {
      setTimeout(() => {
        try {
          this.map.fitBounds(bounds, { 
            padding: [20, 20],
            maxZoom: 15 
          });
        } catch (error) {
          console.error('Error fitting bounds:', error);
        }
      }, 500);
    }
  }

  highlightMarker(selectedMarker) {
    this.markers.forEach(marker => {
      if (marker === selectedMarker) {
        // Highlight selected marker
        marker.setZIndexOffset(1000);
        
        // Change icon to highlighted version
        const highlightedIcon = L.divIcon({
          className: 'highlighted-marker-icon',
          html: '<div style="background-color: #f59e0b; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        marker.setIcon(highlightedIcon);
      } else {
        // Reset other markers
        marker.setZIndexOffset(0);
        
        const defaultIcon = L.divIcon({
          className: 'default-marker-icon',
          html: '<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        
        marker.setIcon(defaultIcon);
      }
    });
  }

  attachMapEventListeners() {
    const baseLayerSelect = this.element.querySelector('#base-layer');
    const locateBtn = this.element.querySelector('#locate-btn');

    if (baseLayerSelect) {
      baseLayerSelect.addEventListener('change', (e) => {
        const selectedLayer = e.target.value;
        this.switchBaseLayer(selectedLayer);
      });
    }

    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        this.locateUser();
      });
    }
  }

  switchBaseLayer(layerName) {
    if (!this.map || !this.tileLayers[layerName]) return;

    // Remove all tile layers
    this.map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        this.map.removeLayer(layer);
      }
    });

    // Add selected layer
    this.tileLayers[layerName].addTo(this.map);

    // Re-add markers
    this.markers.forEach(marker => {
      marker.addTo(this.map);
    });
  }

  locateUser() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    const locateBtn = this.element.querySelector('#locate-btn');
    locateBtn.disabled = true;
    locateBtn.textContent = 'Locating...';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Add user location marker
        const userMarker = L.marker([latitude, longitude])
          .addTo(this.map)
          .bindPopup('Your Current Location')
          .openPopup();

        // Center map on user location
        this.map.setView([latitude, longitude], 13);

        // Remove user marker after 10 seconds
        setTimeout(() => {
          if (userMarker) {
            this.map.removeLayer(userMarker);
          }
        }, 10000);

        locateBtn.disabled = false;
        locateBtn.textContent = '📍 My Location';
      },
      (error) => {
        console.error('Geolocation error:', error);
        let message = 'Unable to get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message += 'Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message += 'Location request timed out.';
            break;
          default:
            message += 'An unknown error occurred.';
        }
        
        alert(message);
        locateBtn.disabled = false;
        locateBtn.textContent = '📍 My Location';
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Cleanup method
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
    this.stories = [];
  }
}