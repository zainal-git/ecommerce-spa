export class DatabaseService {
  static DB_NAME = 'ECommerceDB';
  static DB_VERSION = 1;
  static STORE_NAME = 'favorites';

  static async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create favorites store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { 
            keyPath: 'id',
            autoIncrement: true 
          });
          
          // Create indexes for searching and filtering
          store.createIndex('productId', 'productId', { unique: true });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  static async addFavorite(product) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const favorite = {
        productId: product.id,
        name: product.name,
        description: product.description,
        photoUrl: product.photoUrl,
        createdAt: new Date().toISOString(),
        synced: false // For offline sync
      };

      return new Promise((resolve, reject) => {
        const request = store.add(favorite);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  static async getFavorites() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  }

  static async deleteFavorite(productId) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('productId');
      
      return new Promise((resolve, reject) => {
        const getRequest = index.getKey(productId);
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            const deleteRequest = store.delete(getRequest.result);
            deleteRequest.onsuccess = () => resolve(true);
            deleteRequest.onerror = () => reject(deleteRequest.error);
          } else {
            resolve(false);
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch (error) {
      console.error('Error deleting favorite:', error);
      throw error;
    }
  }

  static async isFavorite(productId) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('productId');
      
      return new Promise((resolve, reject) => {
        const request = index.getKey(productId);
        
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  }

  static async searchFavorites(query) {
    try {
      const favorites = await this.getFavorites();
      const searchTerm = query.toLowerCase();
      
      return favorites.filter(favorite => 
        favorite.name.toLowerCase().includes(searchTerm) ||
        favorite.description.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching favorites:', error);
      return [];
    }
  }

  static async sortFavorites(sortBy = 'createdAt', sortOrder = 'desc') {
    try {
      const favorites = await this.getFavorites();
      
      return favorites.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        if (sortBy === 'createdAt') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    } catch (error) {
      console.error('Error sorting favorites:', error);
      return [];
    }
  }

  static async syncOfflineFavorites() {
    try {
      const favorites = await this.getFavorites();
      const unsyncedFavorites = favorites.filter(fav => !fav.synced);
      
      // Here you would typically send unsynced favorites to your backend
      // For now, we'll just mark them as synced
      if (unsyncedFavorites.length > 0 && navigator.onLine) {
        const db = await this.openDB();
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        
        unsyncedFavorites.forEach(favorite => {
          favorite.synced = true;
          store.put(favorite);
        });
        
        console.log(`Synced ${unsyncedFavorites.length} favorites`);
      }
    } catch (error) {
      console.error('Error syncing favorites:', error);
    }
  }
}