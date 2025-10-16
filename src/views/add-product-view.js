import { ApiService } from '../config/api.js';
import { AuthService } from '../utils/auth.js';
import { ViewTransition } from '../utils/view-transition.js';

export class AddProductView {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'view add-product-view';
    this.element.setAttribute('role', 'main');
    this.element.setAttribute('aria-label', 'Add New Product');
    this.selectedLocation = null;
    this.map = null;
    this.marker = null;
    this.mediaStream = null;
    this.capturedPhoto = null;
  }

  async render() {
    // Check authentication
    if (!AuthService.isAuthenticated()) {
      window.location.hash = '/login';
      return this.element;
    }

    this.element.innerHTML = `
      <section class="add-product-section" aria-labelledby="add-product-title">
        <h1 id="add-product-title">Add New Product</h1>
        <p class="section-description">Fill out the form below to add a new product to our store.</p>
        
        <form id="add-product-form" class="product-form" novalidate>
          <div class="form-group">
            <label for="product-name" class="form-label">Product Name *</label>
            <input 
              type="text" 
              id="product-name" 
              name="name" 
              class="form-input" 
              required 
              aria-required="true"
              aria-describedby="name-error"
              placeholder="Enter product name"
            >
            <div id="name-error" class="error-text" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-group">
            <label for="product-description" class="form-label">Description *</label>
            <textarea 
              id="product-description" 
              name="description" 
              class="form-textarea" 
              rows="4" 
              required 
              aria-required="true"
              aria-describedby="description-error"
              placeholder="Describe your product..."
            ></textarea>
            <div id="description-error" class="error-text" role="alert" aria-live="polite"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Product Photo *</label>
            
            <div class="photo-options">
              <div class="photo-option">
                <input type="radio" id="upload-option" name="photo-option" value="upload" checked>
                <label for="upload-option">Upload File</label>
              </div>
              <div class="photo-option">
                <input type="radio" id="camera-option" name="photo-option" value="camera">
                <label for="camera-option">Use Camera</label>
              </div>
            </div>

            <div id="upload-section" class="photo-section">
              <input 
                type="file" 
                id="product-photo" 
                name="photo" 
                accept="image/*" 
                class="form-input" 
                required 
                aria-required="true"
                aria-describedby="photo-error"
              >
              <div class="help-text">Maximum file size: 1MB. Supported formats: JPG, PNG, GIF</div>
              <div id="photo-error" class="error-text" role="alert" aria-live="polite"></div>
            </div>

            <div id="camera-section" class="photo-section" style="display: none;">
              <div class="camera-container">
                <video id="camera-preview" autoplay playsinline muted aria-label="Camera preview"></video>
                <canvas id="photo-canvas" style="display: none;"></canvas>
                <div class="camera-controls">
                  <button type="button" id="capture-btn" class="btn btn-secondary">Capture Photo</button>
                  <button type="button" id="retake-btn" class="btn btn-secondary" style="display: none;">Retake Photo</button>
                </div>
              </div>
              <div id="camera-error" class="error-text" role="alert" aria-live="polite"></div>
            </div>

            <div id="photo-preview" class="photo-preview" aria-live="polite"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Store Location (Optional)</label>
            <p class="location-help">Click on the map below to set your store location. This helps customers find your store.</p>
            
            <div id="location-map" class="location-map" style="height: 300px; border-radius: 8px; margin: 1rem 0;">
              <!-- Map will be initialized here -->
            </div>
            
            <div class="location-info" id="location-info" aria-live="polite">
              ${this.selectedLocation ? 
                `Selected location: ${this.selectedLocation.lat.toFixed(4)}, ${this.selectedLocation.lon.toFixed(4)}` : 
                'No location selected. Click on the map to set a location.'}
            </div>
            <button type="button" id="clear-location" class="btn btn-text" style="display: ${this.selectedLocation ? 'inline-block' : 'none'}">
              Clear Location
            </button>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-secondary" id="submit-btn">
              <span class="btn-text">Add Product</span>
              <span class="btn-loading" style="display: none;">Adding...</span>
            </button>
            <button type="button" class="btn btn-secondary" id="reset-btn">
              Reset Form
            </button>
          </div>

          <div id="form-message" role="alert" aria-live="assertive" hidden></div>
        </form>
      </section>
    `;

    // Initialize map after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeMap();
    }, 100);

    this.attachEventListeners();
    await ViewTransition.fadeIn(this.element);
    return this.element;
  }

  async initializeMap() {
    const mapContainer = this.element.querySelector('#location-map');
    
    try {
      if (typeof L === 'undefined') {
        throw new Error('Map library not loaded');
      }

      if (mapContainer.offsetHeight === 0) {
        mapContainer.style.height = '300px';
      }

      // Initialize map centered on Indonesia
      this.map = L.map('location-map').setView([-2.5489, 118.0149], 5);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);

      // Add click event to set location
      this.map.on('click', (e) => {
        this.setLocation(e.latlng.lat, e.latlng.lng);
      });

      console.log('Map initialized successfully');

    } catch (error) {
      console.error('Error initializing map:', error);
      mapContainer.innerHTML = `
        <div class="error-message" style="padding: 2rem; text-align: center; color: var(--error-color);">
          <p>Unable to load map. Please refresh the page and try again.</p>
          <p><small>Error: ${error.message}</small></p>
        </div>
      `;
    }
  }

  setLocation(lat, lon) {
    this.selectedLocation = { lat, lon };
    
    // Remove existing marker
    if (this.marker) {
      this.map.removeLayer(this.marker);
    }
    
    // Add new marker
    this.marker = L.marker([lat, lon])
      .addTo(this.map)
      .bindPopup('Selected Location<br>' + lat.toFixed(4) + ', ' + lon.toFixed(4))
      .openPopup();

    // Update location info
    const locationInfo = this.element.querySelector('#location-info');
    const clearBtn = this.element.querySelector('#clear-location');
    
    locationInfo.textContent = `Selected location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    locationInfo.style.color = 'var(--success-color)';
    clearBtn.style.display = 'inline-block';

    // Pan map to selected location
    this.map.setView([lat, lon], this.map.getZoom());
  }

  attachEventListeners() {
    const form = this.element.querySelector('#add-product-form');
    const photoOptionRadios = this.element.querySelectorAll('input[name="photo-option"]');
    const resetBtn = this.element.querySelector('#reset-btn');
    const clearLocationBtn = this.element.querySelector('#clear-location');
    const fileInput = this.element.querySelector('#product-photo');

    // Photo option toggle
    photoOptionRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handlePhotoOptionChange(e.target.value);
      });
    });

    // File input change
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileSelect(e.target.files[0]);
      });
    }

    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Form reset
    resetBtn.addEventListener('click', () => {
      this.resetForm();
    });

    // Clear location
    clearLocationBtn.addEventListener('click', () => {
      this.clearLocation();
    });

    // Initialize camera controls if camera option is selected by default
    const cameraOption = this.element.querySelector('#camera-option');
    if (cameraOption && cameraOption.checked) {
      this.handlePhotoOptionChange('camera');
    }
  }

  handlePhotoOptionChange(option) {
    const uploadSection = this.element.querySelector('#upload-section');
    const cameraSection = this.element.querySelector('#camera-section');
    const fileInput = this.element.querySelector('#product-photo');

    // Clear previous errors and preview
    this.clearPhotoErrors();
    this.clearPhotoPreview();

    if (option === 'upload') {
      uploadSection.style.display = 'block';
      cameraSection.style.display = 'none';
      this.stopCamera();
      fileInput.required = true;
    } else {
      uploadSection.style.display = 'none';
      cameraSection.style.display = 'block';
      fileInput.required = false;
      this.startCamera();
    }
  }

  async startCamera() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        } 
      });
      
      const video = this.element.querySelector('#camera-preview');
      const captureBtn = this.element.querySelector('#capture-btn');
      const retakeBtn = this.element.querySelector('#retake-btn');
      
      video.srcObject = this.mediaStream;
      captureBtn.style.display = 'inline-block';
      retakeBtn.style.display = 'none';
      
      // Attach camera control events
      captureBtn.onclick = () => this.capturePhoto();
      retakeBtn.onclick = () => this.retakePhoto();

    } catch (error) {
      console.error('Error accessing camera:', error);
      this.showCameraError('Unable to access camera: ' + error.message);
    }
  }

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    const video = this.element.querySelector('#camera-preview');
    if (video) {
      video.srcObject = null;
    }
  }

  capturePhoto() {
    const video = this.element.querySelector('#camera-preview');
    const canvas = this.element.querySelector('#photo-canvas');
    const captureBtn = this.element.querySelector('#capture-btn');
    const retakeBtn = this.element.querySelector('#retake-btn');
    const preview = this.element.querySelector('#photo-preview');

    if (!video.videoWidth || !video.videoHeight) {
      this.showCameraError('Camera not ready. Please try again.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Store captured photo as data URL
    this.capturedPhoto = canvas.toDataURL('image/jpeg');

    // Show preview
    preview.innerHTML = `
      <div class="photo-preview-content">
        <h4>Captured Photo:</h4>
        <img src="${this.capturedPhoto}" alt="Captured product photo" class="captured-photo">
        <p class="help-text">Photo captured successfully. You can retake if needed.</p>
      </div>
    `;

    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-block';

    this.stopCamera();
  }

  retakePhoto() {
    const captureBtn = this.element.querySelector('#capture-btn');
    const retakeBtn = this.element.querySelector('#retake-btn');
    const preview = this.element.querySelector('#photo-preview');

    captureBtn.style.display = 'inline-block';
    retakeBtn.style.display = 'none';
    preview.innerHTML = '';
    this.capturedPhoto = null;

    this.startCamera();
  }

  handleFileSelect(file) {
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      this.showPhotoError('Please select an image file.');
      return;
    }

    if (file.size > 1024 * 1024) { // 1MB
      this.showPhotoError('File size must be less than 1MB.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = this.element.querySelector('#photo-preview');
      preview.innerHTML = `
        <div class="photo-preview-content">
          <h4>Selected Photo:</h4>
          <img src="${e.target.result}" alt="Selected product photo" class="captured-photo">
          <p class="help-text">${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
        </div>
      `;
    };
    reader.readAsDataURL(file);

    this.clearPhotoErrors();
  }

  async handleFormSubmit() {
    const form = this.element.querySelector('#add-product-form');
    const submitBtn = this.element.querySelector('#submit-btn');
    const submitText = submitBtn.querySelector('.btn-text');
    const submitLoading = submitBtn.querySelector('.btn-loading');

    if (!this.validateForm()) {
      return;
    }

    try {
      // Show loading state
      submitBtn.disabled = true;
      submitText.style.display = 'none';
      submitLoading.style.display = 'inline';

      const formData = new FormData();

      // Get form values
      const name = this.element.querySelector('#product-name').value;
      const description = this.element.querySelector('#product-description').value;
      const photoOption = this.element.querySelector('input[name="photo-option"]:checked').value;

      // Combine name and description for the API
      const combinedDescription = `${name} - ${description}`;
      formData.append('description', combinedDescription);

      // Handle photo
      if (photoOption === 'upload') {
        const photoFile = this.element.querySelector('#product-photo').files[0];
        formData.append('photo', photoFile);
      } else {
        // Convert data URL to blob for camera photo
        if (this.capturedPhoto) {
          const response = await fetch(this.capturedPhoto);
          const blob = await response.blob();
          formData.append('photo', blob, 'product-photo.jpg');
        } else {
          throw new Error('No photo captured');
        }
      }

      // Add location if selected
      if (this.selectedLocation) {
        formData.append('lat', this.selectedLocation.lat.toString());
        formData.append('lon', this.selectedLocation.lon.toString());
      }

      const token = AuthService.getToken();
      await ApiService.addStory(token, formData);

      this.showMessage('Product added successfully! Redirecting to products page...', 'success');
      
      // Redirect to products page after 2 seconds
      setTimeout(() => {
        window.location.hash = '/products';
      }, 2000);

    } catch (error) {
      console.error('Error adding product:', error);
      this.showMessage('Error adding product: ' + error.message, 'error');
    } finally {
      // Reset loading state
      submitBtn.disabled = false;
      submitText.style.display = 'inline';
      submitLoading.style.display = 'none';
    }
  }

  validateForm() {
    let isValid = true;
    this.clearErrors();

    const name = this.element.querySelector('#product-name').value.trim();
    const description = this.element.querySelector('#product-description').value.trim();
    const photoOption = this.element.querySelector('input[name="photo-option"]:checked').value;

    // Validate name
    if (!name) {
      this.showError('product-name', 'Product name is required');
      isValid = false;
    } else if (name.length < 2) {
      this.showError('product-name', 'Product name must be at least 2 characters long');
      isValid = false;
    }

    // Validate description
    if (!description) {
      this.showError('product-description', 'Description is required');
      isValid = false;
    } else if (description.length < 10) {
      this.showError('product-description', 'Description must be at least 10 characters long');
      isValid = false;
    }

    // Validate photo
    if (photoOption === 'upload') {
      const fileInput = this.element.querySelector('#product-photo');
      if (!fileInput.files || fileInput.files.length === 0) {
        this.showPhotoError('Please select a product photo');
        isValid = false;
      }
    } else {
      if (!this.capturedPhoto) {
        this.showCameraError('Please capture a photo first');
        isValid = false;
      }
    }

    return isValid;
  }

  showError(fieldId, message) {
    const errorElement = this.element.querySelector(`#${fieldId}-error`);
    if (errorElement) {
      errorElement.textContent = message;
    }
    
    const fieldElement = this.element.querySelector(`#${fieldId}`);
    if (fieldElement) {
      fieldElement.setAttribute('aria-invalid', 'true');
      fieldElement.focus();
    }
  }

  showPhotoError(message) {
    this.showError('product-photo', message);
  }

  showCameraError(message) {
    const errorElement = this.element.querySelector('#camera-error');
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  clearErrors() {
    const errorElements = this.element.querySelectorAll('.error-text');
    errorElements.forEach(element => {
      element.textContent = '';
    });

    const fieldElements = this.element.querySelectorAll('[aria-invalid]');
    fieldElements.forEach(element => {
      element.removeAttribute('aria-invalid');
    });
  }

  clearPhotoErrors() {
    this.showPhotoError('');
    this.showCameraError('');
  }

  clearPhotoPreview() {
    const preview = this.element.querySelector('#photo-preview');
    preview.innerHTML = '';
  }

  showMessage(message, type) {
    const messageElement = this.element.querySelector('#form-message');
    messageElement.textContent = message;
    messageElement.className = `form-message ${type}`;
    messageElement.hidden = false;

    // Scroll to message
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setTimeout(() => {
      messageElement.hidden = true;
    }, 5000);
  }

  clearLocation() {
    this.selectedLocation = null;
    
    if (this.marker) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }

    const locationInfo = this.element.querySelector('#location-info');
    const clearBtn = this.element.querySelector('#clear-location');
    
    locationInfo.textContent = 'No location selected. Click on the map to set a location.';
    locationInfo.style.color = '';
    clearBtn.style.display = 'none';
  }

  resetForm() {
    const form = this.element.querySelector('#add-product-form');
    form.reset();
    this.clearErrors();
    this.clearPhotoPreview();
    this.clearLocation();
    
    this.capturedPhoto = null;
    this.stopCamera();
    
    // Reset to upload option
    const uploadOption = this.element.querySelector('#upload-option');
    uploadOption.checked = true;
    this.handlePhotoOptionChange('upload');

    this.showMessage('Form has been reset', 'success');
  }

  // Cleanup when view is removed
  destroy() {
    this.stopCamera();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}