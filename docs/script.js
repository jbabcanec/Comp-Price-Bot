// GitHub repository information
const GITHUB_REPO = 'jbabcanec/Comp-Price-Bot';
const GITHUB_API_BASE = 'https://api.github.com';

// Download button mappings
const downloadMappings = {
    windows: {
        installer: (assets) => findAsset(assets, ['Setup', '.exe']) || findAsset(assets, ['setup', 'installer']),
        portable: (assets) => findAsset(assets, ['portable', '.exe']) || findAsset(assets, ['.exe'], ['Setup', 'setup']),
        zip: (assets) => findAsset(assets, ['win32', '.zip']) || findAsset(assets, ['windows', '.zip'])
    },
    mac: {
        dmg: (assets) => findAsset(assets, ['.dmg'], ['arm64']),
        'zip-intel': (assets) => findAsset(assets, ['mac.zip', 'x64']) || findAsset(assets, ['.zip'], ['arm64', 'dmg']),
        'zip-arm': (assets) => findAsset(assets, ['arm64-mac.zip']) || findAsset(assets, ['arm64', '.zip'])
    },
    linux: {
        appimage: (assets) => findAsset(assets, ['.AppImage']),
        deb: (assets) => findAsset(assets, ['.deb'])
    }
};

// Utility function to find assets
function findAsset(assets, includes, excludes = []) {
    return assets.find(asset => {
        const name = asset.name.toLowerCase();
        const hasIncludes = includes.every(term => name.includes(term.toLowerCase()));
        const hasExcludes = excludes.some(term => name.includes(term.toLowerCase()));
        return hasIncludes && !hasExcludes;
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Smooth scroll to download section
function scrollToDownload() {
    document.getElementById('download').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// Show loading state
function setLoadingState(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        button.style.position = 'relative';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Download file
async function downloadFile(url, filename) {
    try {
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Track download (if analytics is set up)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'download', {
                event_category: 'file_download',
                event_label: filename
            });
        }
        
        return true;
    } catch (error) {
        console.error('Download failed:', error);
        return false;
    }
}

// Handle download button click
async function handleDownload(button, platform, type) {
    setLoadingState(button, true);
    
    try {
        const releases = await fetchLatestRelease();
        const asset = downloadMappings[platform]?.[type]?.(releases.assets);
        
        if (asset) {
            const success = await downloadFile(asset.browser_download_url, asset.name);
            if (success) {
                // Update button text temporarily
                const originalText = button.querySelector('span').textContent;
                button.querySelector('span').textContent = 'Downloaded!';
                setTimeout(() => {
                    button.querySelector('span').textContent = originalText;
                }, 2000);
            } else {
                throw new Error('Download failed');
            }
        } else {
            throw new Error('File not found in latest release');
        }
    } catch (error) {
        console.error('Download error:', error);
        
        // Fallback to GitHub releases page
        window.open(`https://github.com/${GITHUB_REPO}/releases/latest`, '_blank');
        
        // Show error message
        const originalText = button.querySelector('span').textContent;
        button.querySelector('span').textContent = 'View on GitHub';
        setTimeout(() => {
            button.querySelector('span').textContent = originalText;
        }, 3000);
    } finally {
        setLoadingState(button, false);
    }
}

// Fetch latest release from GitHub API
async function fetchLatestRelease() {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }
    return response.json();
}

// Update download buttons with latest release info
async function updateDownloadButtons() {
    try {
        const release = await fetchLatestRelease();
        
        // Update version numbers if elements exist
        const versionElements = document.querySelectorAll('.version');
        versionElements.forEach(el => {
            el.textContent = release.tag_name;
        });
        
        // Update file sizes in download buttons
        document.querySelectorAll('.download-btn').forEach(button => {
            const platform = button.dataset.platform;
            const type = button.dataset.type;
            
            if (platform && type && downloadMappings[platform]?.[type]) {
                const asset = downloadMappings[platform][type](release.assets);
                if (asset) {
                    const sizeElement = button.querySelector('small');
                    if (sizeElement) {
                        const currentText = sizeElement.textContent;
                        const sizeText = formatFileSize(asset.size);
                        sizeElement.textContent = currentText.replace(/~?\d+(\.\d+)?\s?(MB|GB|KB)/, sizeText);
                    }
                }
            }
        });
        
        console.log('Download buttons updated with latest release info');
    } catch (error) {
        console.warn('Could not fetch latest release info:', error.message);
    }
}

// Initialize download button event listeners
function initializeDownloadButtons() {
    document.querySelectorAll('.download-btn').forEach(button => {
        const platform = button.dataset.platform;
        const type = button.dataset.type;
        
        if (platform && type) {
            button.addEventListener('click', () => {
                handleDownload(button, platform, type);
            });
        }
    });
}

// Detect user's platform and highlight appropriate download
function detectAndHighlightPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    let detectedPlatform = 'windows'; // default
    
    if (userAgent.includes('mac')) {
        detectedPlatform = 'mac';
    } else if (userAgent.includes('linux')) {
        detectedPlatform = 'linux';
    }
    
    // Add emphasis to detected platform
    const platformCards = document.querySelectorAll('.platform-card');
    platformCards.forEach((card, index) => {
        const platforms = ['windows', 'mac', 'linux'];
        if (platforms[index] === detectedPlatform) {
            card.style.border = '2px solid var(--primary-color)';
            card.style.transform = 'scale(1.02)';
            
            // Add a "Recommended" badge
            const badge = document.createElement('div');
            badge.textContent = 'Recommended for your system';
            badge.style.cssText = `
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--primary-color);
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 1rem;
                font-size: 0.75rem;
                font-weight: 600;
                white-space: nowrap;
            `;
            card.style.position = 'relative';
            card.appendChild(badge);
        }
    });
}

// Navbar scroll effect
function initializeNavbarScroll() {
    let lastScrollY = window.scrollY;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = 'var(--shadow-md)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
        
        // Hide navbar when scrolling down, show when scrolling up
        if (currentScrollY > lastScrollY && currentScrollY > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
    });
}

// Add smooth animations on scroll
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.feature-card, .platform-card, .support-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Add keyboard navigation support
function initializeKeyboardNavigation() {
    let focusIndex = -1;
    const focusableElements = document.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            // Let browser handle tab navigation
            return;
        }
        
        if (e.key === 'Enter' && e.target.classList.contains('download-btn')) {
            e.target.click();
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('HVAC Price Analyzer website loaded');
    
    // Initialize all features
    initializeDownloadButtons();
    initializeNavbarScroll();
    initializeScrollAnimations();
    initializeKeyboardNavigation();
    
    // Update with latest release info
    updateDownloadButtons();
    
    // Detect and highlight user's platform
    detectAndHighlightPlatform();
    
    // Make scrollToDownload available globally
    window.scrollToDownload = scrollToDownload;
});

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Refresh release info when page becomes visible again
        updateDownloadButtons();
    }
});

// Error handling for uncaught errors
window.addEventListener('error', (e) => {
    console.error('Uncaught error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});

// Export functions for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        findAsset,
        formatFileSize,
        downloadFile,
        fetchLatestRelease
    };
}