export const API_CONFIG = {
  BASE_URL: 'https://story-api.dicoding.dev/v1',
  ENDPOINTS: {
    REGISTER: '/register',
    LOGIN: '/login',
    STORIES: '/stories',
    STORIES_GUEST: '/stories/guest',
    NOTIFICATIONS: '/notifications/subscribe'
  }
};

export class ApiService {
  static async request(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  }

  static async getStories(token, location = 0) {
    const endpoint = `${API_CONFIG.ENDPOINTS.STORIES}?location=${location}`;
    return this.request(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  static async addStory(token, formData) {
    return this.request(API_CONFIG.ENDPOINTS.STORIES, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
  }

  static async login(email, password) {
    return this.request(API_CONFIG.ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  static async register(name, email, password) {
    return this.request(API_CONFIG.ENDPOINTS.REGISTER, {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  }
}