import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function deployToGitHubPages() {
  console.log('🚀 Starting deployment to GitHub Pages...');
  
  try {
    // Build the project
    console.log('📦 Building project...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Create .nojekyll file to bypass Jekyll processing
    console.log('📄 Creating .nojekyll file...');
    fs.writeFileSync(path.join('dist', '.nojekyll'), '');
    
    // Create CNAME file if you have a custom domain (optional)
    // fs.writeFileSync(path.join('dist', 'CNAME'), 'your-domain.com');
    
    // Deploy to GitHub Pages
    console.log('🌐 Deploying to GitHub Pages...');
    execSync('npx gh-pages -d dist', { stdio: 'inherit' });
    
    console.log('✅ Deployment completed successfully!');
    console.log('📱 Your app should be live at: https://your-username.github.io/ecommerce-spa/');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deployToGitHubPages();