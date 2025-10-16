import { NotificationService } from '../utils/notification.js';

export class HeaderComponent {
  constructor() {
    this.element = document.createElement('header');
    this.element.setAttribute('role', 'banner');
    this.notificationEnabled = false;
  }

  async render() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    this.notificationEnabled = await NotificationService.isSubscribed();
    
    this.element.innerHTML = `
      <nav class="navbar" role="navigation" aria-label="Main navigation">
        <div class="nav-brand">
          <h1>
            <a href="#/" class="nav-logo" aria-label="E-Commerce Home">
              🛍️ E-Commerce
            </a>
          </h1>
        </div>
        
        <ul class="nav-menu" role="menubar">
          <li role="none">
            <a href="#/" class="nav-link" role="menuitem" data-link>Home</a>
          </li>
          <li role="none">
            <a href="#/products" class="nav-link" role="menuitem" data-link>Products</a>
          </li>
          <li role="none">
            <a href="#/map" class="nav-link" role="menuitem" data-link>Store Map</a>
          </li>
          <li role="none">
            <a href="#/favorites" class="nav-link" role="menuitem" data-link>Favorites</a>
          </li>
          ${userInfo.name ? `
            <li role="none">
              <a href="#/add-product" class="nav-link" role="menuitem" data-link>Add Product</a>
            </li>
            <li role="none" class="nav-user">
              <button id="notification-toggle" class="btn-notification ${this.notificationEnabled ? 'enabled' : ''}" 
                      aria-label="${this.notificationEnabled ? 'Disable' : 'Enable'} notifications">
                ${this.notificationEnabled ? '🔔' : '🔕'}
              </button>
              <span class="user-info">Welcome, ${userInfo.name}</span>
              <button id="logout-btn" class="btn-logout" aria-label="Logout">Logout</button>
            </li>
          ` : `
            <li role="none">
              <a href="#/login" class="nav-link" role="menuitem" data-link>Login</a>
            </li>
          `}
        </ul>
        
        <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>
    `;

    this.attachEventListeners();
    return this.element;
  }

  attachEventListeners() {
    const logoutBtn = this.element.querySelector('#logout-btn');
    const notificationToggle = this.element.querySelector('#notification-toggle');
    const navToggle = this.element.querySelector('.nav-toggle');
    const navMenu = this.element.querySelector('.nav-menu');

    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout);
    }

    if (notificationToggle) {
      notificationToggle.addEventListener('click', this.handleNotificationToggle.bind(this));
    }

    if (navToggle) {
      navToggle.addEventListener('click', () => {
        const expanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', (!expanded).toString());
        navMenu.classList.toggle('active');
      });
    }
  }

  async handleNotificationToggle() {
    const toggleBtn = this.element.querySelector('#notification-toggle');
    
    try {
      if (await NotificationService.isSubscribed()) {
        await NotificationService.unsubscribeFromPush();
        toggleBtn.classList.remove('enabled');
        toggleBtn.innerHTML = '🔕';
        toggleBtn.setAttribute('aria-label', 'Enable notifications');
        NotificationService.showLocalNotification('Notifications Disabled', {
          body: 'You will no longer receive push notifications',
          data: { url: '/products' }
        });
      } else {
        const permission = await NotificationService.requestPermission();
        if (permission) {
          await NotificationService.subscribeToPush();
          toggleBtn.classList.add('enabled');
          toggleBtn.innerHTML = '🔔';
          toggleBtn.setAttribute('aria-label', 'Disable notifications');
          NotificationService.showLocalNotification('Notifications Enabled', {
            body: 'You will now receive push notifications for new products',
            data: { url: '/products' }
          });
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    }
  }

  handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    window.location.hash = '/';
    window.location.reload();
  }
}