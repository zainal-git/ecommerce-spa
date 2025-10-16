import { ApiService } from '../config/api.js';
import { AuthService } from '../utils/auth.js';
import { ViewTransition } from '../utils/view-transition.js';
import { DatabaseService } from '../utils/database.js';
import { NotificationService } from '../utils/notification.js';

export class ProductsView {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'view products-view';
    this.element.setAttribute('role', 'main');
    this.element.setAttribute('aria-label', 'Products Page');
    this.stories = [];
    this.favorites = new Set();
  }

  async render() {
    this.element.innerHTML = `
      <section class="products-section" aria-labelledby="products-title">
        <div class="section-header">
          <h1 id="products-title">Our Products</h1>
          <div class="filter-controls">
            <label for="location-filter" class="filter-label">Filter by Location:</label>
            <select id="location-filter" class="filter-select" aria-label="Filter products by location availability">
              <option value="0">All Products</option>
              <option value="1">With Location</option>
            </select>
          </div>
        </div>
        
        <div class="loading-spinner" id="loading-spinner" aria-live="polite" aria-label="Loading products">
          Loading products...
        </div>
        
        <div class="products-grid" id="products-grid" role="list" aria-label="List of products">
          <!-- Products will be loaded here -->
        </div>
        
        <div class="error-message" id="error-message" role="alert" aria-live="assertive" hidden>
          <!-- Error messages will be shown here -->
        </div>
      </section>
    `;

    await this.loadFavorites();
    await this.loadProducts();
    this.attachEventListeners();
    await ViewTransition.fadeIn(this.element);
    return this.element;
  }

  async loadFavorites() {
    try {
      const favorites = await DatabaseService.getFavorites();
      this.favorites = new Set(favorites.map(fav => fav.productId));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  async loadProducts(locationFilter = 0) {
    const spinner = this.element.querySelector('#loading-spinner');
    const grid = this.element.querySelector('#products-grid');
    const errorMsg = this.element.querySelector('#error-message');

    try {
      spinner.style.display = 'block';
      grid.style.display = 'none';
      errorMsg.hidden = true;

      const token = AuthService.isAuthenticated() ? AuthService.getToken() : null;
      
      let response;
      if (token) {
        response = await ApiService.getStories(token, locationFilter);
      } else {
        // Handle guest access or show login prompt
        grid.innerHTML = `
          <div class="empty-state" role="status">
            <p>Please login to view products</p>
            <a href="#/login" class="btn btn-primary" data-link>Login</a>
          </div>
        `;
        grid.style.display = 'block';
        spinner.style.display = 'none';
        return;
      }

      this.stories = response.listStory || [];

      if (this.stories.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" role="status">
            <p>No products found. Be the first to add one!</p>
            <a href="#/add-product" class="btn" style="background-color: #8B5CF6; color: white;" data-link>Add Product</a>
          </div>
        `;
      } else {
        grid.innerHTML = this.stories.map(story => {
          const isFavorite = this.favorites.has(story.id);
          return `
            <div class="product-card" role="listitem" data-product-id="${story.id}">
              <div class="product-image">
                <img src="${story.photoUrl}" alt="${story.description}" loading="lazy">
                <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" 
                        data-product-id="${story.id}"
                        aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                  ${isFavorite ? '❤️' : '🤍'}
                </button>
              </div>
              <div class="product-info">
                <h3 class="product-name">${story.name}</h3>
                <p class="product-description">${story.description}</p>
                <div class="product-meta">
                  <span class="product-date">${new Date(story.createdAt).toLocaleDateString()}</span>
                  ${story.lat && story.lon ? `
                    <span class="product-location" aria-label="Has location information">📍</span>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      grid.style.display = 'grid';
    } catch (error) {
      errorMsg.hidden = false;
      errorMsg.textContent = `Error loading products: ${error.message}`;
      grid.innerHTML = '';
    } finally {
      spinner.style.display = 'none';
    }
  }

  attachEventListeners() {
    const locationFilter = this.element.querySelector('#location-filter');
    locationFilter.addEventListener('change', (e) => {
      this.loadProducts(parseInt(e.target.value));
    });

    // Favorite button events
    this.element.addEventListener('click', async (e) => {
      if (e.target.classList.contains('favorite-btn')) {
        const productId = e.target.getAttribute('data-product-id');
        await this.handleFavoriteToggle(productId, e.target);
      }
    });
  }

  async handleFavoriteToggle(productId, button) {
    try {
      const story = this.stories.find(s => s.id === productId);
      
      if (!story) return;

      if (this.favorites.has(productId)) {
        // Remove from favorites
        await DatabaseService.deleteFavorite(productId);
        this.favorites.delete(productId);
        button.classList.remove('favorited');
        button.innerHTML = '🤍';
        button.setAttribute('aria-label', 'Add to favorites');
        
        NotificationService.showLocalNotification('Removed from Favorites', {
          body: `${story.name} has been removed from your favorites`,
          data: { url: '/favorites' }
        });
      } else {
        // Add to favorites
        await DatabaseService.addFavorite(story);
        this.favorites.add(productId);
        button.classList.add('favorited');
        button.innerHTML = '❤️';
        button.setAttribute('aria-label', 'Remove from favorites');
        
        NotificationService.showLocalNotification('Added to Favorites', {
          body: `${story.name} has been added to your favorites`,
          data: { url: '/favorites' }
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }
}