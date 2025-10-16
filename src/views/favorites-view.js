import { DatabaseService } from '../utils/database.js';
import { ViewTransition } from '../utils/view-transition.js';
import { AuthService } from '../utils/auth.js';

export class FavoritesView {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'view favorites-view';
    this.element.setAttribute('role', 'main');
    this.element.setAttribute('aria-label', 'Favorite Products');
    this.favorites = [];
    this.filteredFavorites = [];
    this.currentSort = 'createdAt';
    this.currentOrder = 'desc';
  }

  async render() {
    this.element.innerHTML = `
      <section class="favorites-section" aria-labelledby="favorites-title">
        <div class="section-header">
          <h1 id="favorites-title">Favorite Products</h1>
          <p class="section-description">Manage your favorite products here. These are stored locally on your device.</p>
        </div>
        
        <div class="favorites-controls">
          <div class="search-control">
            <label for="favorites-search" class="form-label">Search Favorites:</label>
            <input 
              type="text" 
              id="favorites-search" 
              class="form-input" 
              placeholder="Search by name or description..."
              aria-label="Search favorites"
            >
          </div>
          
          <div class="sort-controls">
            <label for="sort-by" class="form-label">Sort by:</label>
            <select id="sort-by" class="form-select" aria-label="Sort favorites by">
              <option value="createdAt">Date Added</option>
              <option value="name">Name</option>
            </select>
            
            <select id="sort-order" class="form-select" aria-label="Sort order">
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
            
            <button id="sync-favorites" class="btn btn-secondary" aria-label="Sync favorites">
              🔄 Sync
            </button>
          </div>
        </div>
        
        <div class="loading-spinner" id="loading-spinner" aria-live="polite">
          Loading favorites...
        </div>
        
        <div class="favorites-grid" id="favorites-grid" role="list" aria-label="List of favorite products">
          <!-- Favorites will be loaded here -->
        </div>
        
        <div class="empty-state" id="empty-state" role="status" hidden>
          <p>No favorite products yet. Start adding some from the products page!</p>
          <a href="#/products" class="btn btn-primary" data-link>Browse Products</a>
        </div>
        
        <div id="favorites-message" role="alert" aria-live="assertive" hidden></div>
      </section>
    `;

    await this.loadFavorites();
    this.attachEventListeners();
    await ViewTransition.fadeIn(this.element);
    return this.element;
  }

  async loadFavorites() {
    const spinner = this.element.querySelector('#loading-spinner');
    const grid = this.element.querySelector('#favorites-grid');
    const emptyState = this.element.querySelector('#empty-state');
    const message = this.element.querySelector('#favorites-message');

    try {
      spinner.style.display = 'block';
      grid.style.display = 'none';
      emptyState.hidden = true;
      message.hidden = true;

      this.favorites = await DatabaseService.sortFavorites(this.currentSort, this.currentOrder);
      this.filteredFavorites = [...this.favorites];

      if (this.favorites.length === 0) {
        grid.style.display = 'none';
        emptyState.hidden = false;
      } else {
        this.renderFavoritesGrid();
        grid.style.display = 'grid';
        emptyState.hidden = true;
      }
    } catch (error) {
      this.showMessage('Error loading favorites: ' + error.message, 'error');
      grid.style.display = 'none';
      emptyState.hidden = false;
    } finally {
      spinner.style.display = 'none';
    }
  }

  renderFavoritesGrid() {
    const grid = this.element.querySelector('#favorites-grid');
    
    grid.innerHTML = this.filteredFavorites.map(favorite => `
      <div class="favorite-card" role="listitem" data-favorite-id="${favorite.id}">
        <div class="favorite-image">
          <img src="${favorite.photoUrl}" alt="${favorite.description}" loading="lazy">
        </div>
        <div class="favorite-info">
          <h3 class="favorite-name">${favorite.name}</h3>
          <p class="favorite-description">${favorite.description}</p>
          <div class="favorite-meta">
            <span class="favorite-date">Added: ${new Date(favorite.createdAt).toLocaleDateString()}</span>
            <span class="sync-status ${favorite.synced ? 'synced' : 'not-synced'}">
              ${favorite.synced ? '✅ Synced' : '⏳ Pending Sync'}
            </span>
          </div>
          <div class="favorite-actions">
            <button class="btn btn-secondary remove-favorite" data-product-id="${favorite.productId}">
              Remove from Favorites
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  attachEventListeners() {
    const searchInput = this.element.querySelector('#favorites-search');
    const sortBySelect = this.element.querySelector('#sort-by');
    const sortOrderSelect = this.element.querySelector('#sort-order');
    const syncButton = this.element.querySelector('#sync-favorites');

    // Search functionality
    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    // Sort functionality
    sortBySelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.applySortAndFilter();
    });

    sortOrderSelect.addEventListener('change', (e) => {
      this.currentOrder = e.target.value;
      this.applySortAndFilter();
    });

    // Sync functionality
    syncButton.addEventListener('click', () => {
      this.handleSync();
    });

    // Remove favorite buttons
    this.element.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-favorite')) {
        const productId = e.target.getAttribute('data-product-id');
        this.handleRemoveFavorite(productId);
      }
    });
  }

  async handleSearch(query) {
    if (query.trim() === '') {
      this.filteredFavorites = [...this.favorites];
    } else {
      this.filteredFavorites = await DatabaseService.searchFavorites(query);
    }
    this.applySortAndFilter();
  }

  async applySortAndFilter() {
    this.filteredFavorites = await DatabaseService.sortFavorites(
      this.currentSort, 
      this.currentOrder,
      this.filteredFavorites
    );
    this.renderFavoritesGrid();
  }

  async handleRemoveFavorite(productId) {
    try {
      await DatabaseService.deleteFavorite(productId);
      this.showMessage('Product removed from favorites', 'success');
      await this.loadFavorites(); // Reload the list
    } catch (error) {
      this.showMessage('Error removing favorite: ' + error.message, 'error');
    }
  }

  async handleSync() {
    const syncButton = this.element.querySelector('#sync-favorites');
    const originalText = syncButton.innerHTML;
    
    try {
      syncButton.disabled = true;
      syncButton.innerHTML = '🔄 Syncing...';
      
      await DatabaseService.syncOfflineFavorites();
      this.showMessage('Favorites synchronized successfully', 'success');
      await this.loadFavorites(); // Reload to update sync status
    } catch (error) {
      this.showMessage('Error syncing favorites: ' + error.message, 'error');
    } finally {
      syncButton.disabled = false;
      syncButton.innerHTML = originalText;
    }
  }

  showMessage(message, type) {
    const messageElement = this.element.querySelector('#favorites-message');
    messageElement.textContent = message;
    messageElement.className = `form-message ${type}`;
    messageElement.hidden = false;

    setTimeout(() => {
      messageElement.hidden = true;
    }, 5000);
  }
}