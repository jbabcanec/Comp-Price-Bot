# HVAC Price Analyzer - GitHub Pages Site

This directory contains the modern, responsive website for HVAC Price Analyzer.

## Features

- 🎨 Modern, sleek design with smooth animations
- 📱 Fully responsive across all devices
- 🚀 Dynamic download buttons with GitHub API integration
- 🔍 Automatic platform detection
- ⚡ Fast loading with optimized assets
- ♿ Accessible with keyboard navigation support
- 🌙 Dark mode support

## Files

- `index.html` - Main landing page
- `styles.css` - Modern CSS with animations and responsive design
- `script.js` - JavaScript for interactivity and GitHub API integration

## GitHub Pages Setup

1. Go to your repository Settings
2. Scroll to "Pages" section
3. Set Source to "Deploy from a branch"
4. Choose "main" branch and "/docs" folder
5. Save and wait for deployment

Your site will be available at: `https://jbabcanec.github.io/Comp-Price-Bot/`

## Features Included

### Dynamic Downloads
- Automatically fetches latest release from GitHub API
- Platform detection and recommendations
- Direct download links for all formats
- File size information
- Fallback to GitHub releases page

### Responsive Design
- Mobile-first approach
- Tablet and desktop optimizations
- Touch-friendly buttons
- Accessible navigation

### Performance
- Optimized CSS and JavaScript
- Lazy loading animations
- Efficient API calls
- Error handling

## Customization

To customize the site:

1. Update repository info in `script.js`:
   ```javascript
   const GITHUB_REPO = 'your-username/your-repo';
   ```

2. Modify colors in `styles.css` CSS variables:
   ```css
   :root {
     --primary-color: #your-color;
   }
   ```

3. Update content in `index.html`