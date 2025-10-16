import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          title: 'E-Commerce App - Jualan Online',
          description: 'Modern E-Commerce Progressive Web Application'
        }
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['leaflet']
        }
      }
    }
  },
  server: {
    host: true,
    port: 3000
  },
  // Base path for GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/ecommerce-spa/' : '/'
});