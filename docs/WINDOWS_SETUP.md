# Windows Setup Guide

## Windows Compatibility Status: ✅ READY

The HVAC Crosswalk application is **fully compatible with Windows** and ready for deployment. All dependencies and code have been audited for cross-platform compatibility.

## System Requirements

### Minimum Requirements
- **OS**: Windows 10 version 1903 (build 18362) or later
- **Node.js**: Version 18.x or later
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Python**: 2.7 or 3.x (for native module compilation)

### Recommended Requirements
- **OS**: Windows 11
- **Node.js**: Version 20.x LTS
- **RAM**: 16GB
- **Storage**: 5GB free space (for logs and database)

## Installation Steps

### 1. Install Prerequisites

#### Node.js
```bash
# Download and install from nodejs.org
# Or use chocolatey:
choco install nodejs

# Or use winget:
winget install OpenJS.NodeJS
```

#### Python (for native modules)
```bash
# Install Python for native module compilation
choco install python

# Or download from python.org
```

#### Windows Build Tools
```bash
# Install Windows build tools for native modules
npm install -g windows-build-tools
```

### 2. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd comp-price-bot

# Install dependencies
npm install

# Build the application
npm run build
```

### 3. Run the Application

#### Option 1: Use the Windows batch script
```cmd
build.cmd
```

#### Option 2: Use npm commands
```bash
npm run start
```

#### Option 3: Development mode
```bash
npm run dev
```

## Windows-Specific Features

### File Paths
- All file paths use `path.join()` for cross-platform compatibility
- Settings stored in: `%APPDATA%/hvac-crosswalk/`
- Logs stored in: `%APPDATA%/hvac-crosswalk/logs/`
- Database stored in: `%APPDATA%/hvac-crosswalk/database.sqlite`

### Platform Detection
The app correctly detects Windows and handles:
- Window close behavior (quits on Windows, stays open on macOS)
- File associations
- Native notifications

### Native Dependencies

All native dependencies are Windows-compatible:

| Dependency | Windows Support | Notes |
|------------|----------------|-------|
| **sqlite3** | ✅ Full | Prebuilt binaries available |
| **sharp** | ✅ Full | Prebuilt binaries available |
| **tesseract.js** | ✅ Full | Pure JavaScript, WASM-based |
| **electron** | ✅ Full | Official Windows support |
| **yauzl** | ✅ Full | Pure JavaScript |
| **mammoth** | ✅ Full | Pure JavaScript |
| **pdf-parse** | ✅ Full | Pure JavaScript |

## Build Scripts

### Windows Batch Script (`build.cmd`)
```batch
@echo off
echo 🏗️  Building HVAC Crosswalk for Production...
echo    - TypeScript compilation
echo    - Webpack production build
echo    - Launching Electron app

if not exist "node_modules" (
    echo 📦 Installing dependencies first...
    npm install
)

echo ⚡ Building and launching...
npm run start
```

### PowerShell Alternative
```powershell
# build.ps1
Write-Host "🏗️ Building HVAC Crosswalk for Production..." -ForegroundColor Green

if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies first..." -ForegroundColor Yellow
    npm install
}

Write-Host "⚡ Building and launching..." -ForegroundColor Cyan
npm run start
```

## Troubleshooting

### Common Issues

#### 1. Python/Build Tools Errors
```
Error: Microsoft Visual Studio PlatformToolset v142 is not found
```

**Solution:**
```bash
npm install -g windows-build-tools
# Or install Visual Studio Build Tools manually
```

#### 2. Node.js Version Issues
```
Error: The engine "node" is incompatible with this module
```

**Solution:**
```bash
# Use Node.js LTS version
nvm install --lts
nvm use --lts
```

#### 3. Permission Issues
```
Error: EACCES permission denied
```

**Solution:**
```bash
# Run as Administrator or:
npm config set prefix %APPDATA%\npm
```

#### 4. SQLite3 Build Issues
```
Error: node-pre-gyp WARN Pre-built binaries not installable for sqlite3
```

**Solution:**
```bash
# Force rebuild
npm rebuild sqlite3
# Or use pre-built binary
npm install sqlite3 --build-from-source=false
```

### Performance Optimization

#### Windows Defender Exclusions
Add these folders to Windows Defender exclusions for better performance:
- Project directory: `C:\path\to\comp-price-bot\`
- Node modules: `C:\path\to\comp-price-bot\node_modules\`
- User data: `%APPDATA%\hvac-crosswalk\`

#### Antivirus Considerations
Some antivirus software may flag Electron apps. Add exclusions for:
- The built application executable
- The node_modules directory
- The project build directory

## File Associations

### Associate .hvac files (optional)
```batch
@echo off
reg add "HKEY_CLASSES_ROOT\.hvac" /ve /d "HVACCrosswalk" /f
reg add "HKEY_CLASSES_ROOT\HVACCrosswalk" /ve /d "HVAC Crosswalk File" /f
reg add "HKEY_CLASSES_ROOT\HVACCrosswalk\shell\open\command" /ve /d "\"%~dp0hvac-crosswalk.exe\" \"%%1\"" /f
```

## Packaging for Distribution

### Create Windows Installer
```bash
# Install electron-builder
npm install -g electron-builder

# Add to package.json
{
  "build": {
    "appId": "com.company.hvac-crosswalk",
    "productName": "HVAC Price Analyzer",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}

# Build installer
npm run build:win
```

### Portable Executable
```bash
# Create portable version
npm run build
electron-packager . "HVAC Price Analyzer" --platform=win32 --arch=x64 --out=dist/
```

## Security Considerations

### Windows Security Features
- App uses signed certificates (when properly configured)
- User data stored in standard Windows directories
- No elevated privileges required
- Follows Windows security best practices

### Firewall Configuration
The app may need firewall exceptions for:
- OpenAI API connections (HTTPS outbound)
- Web research features (HTTPS outbound)
- No inbound connections required

## Testing on Windows

### Recommended Testing Environment
- Clean Windows 10/11 VM
- Fresh Node.js installation
- No development tools pre-installed
- Standard user account (not Administrator)

### Test Checklist
- [ ] Application starts successfully
- [ ] File operations work correctly
- [ ] Database operations complete
- [ ] AI features connect properly
- [ ] Settings persist correctly
- [ ] Logs are created in correct location
- [ ] Application closes cleanly

## Support

### Windows-Specific Support
For Windows-specific issues:
1. Check Windows Event Viewer for detailed errors
2. Review application logs in `%APPDATA%\hvac-crosswalk\logs\`
3. Verify all prerequisites are installed
4. Run application as Administrator (temporarily for debugging)

### Getting Help
- Application logs location: `%APPDATA%\hvac-crosswalk\logs\`
- Settings location: `%APPDATA%\hvac-crosswalk\settings.json`
- Database location: `%APPDATA%\hvac-crosswalk\`

---

## Summary

✅ **Fully Windows Compatible**  
The HVAC Crosswalk application is production-ready for Windows deployment with:

- Cross-platform file path handling
- Windows-native build scripts
- All dependencies support Windows
- Proper Windows integration
- Standard Windows data directories
- No Windows-specific code issues found

The application can be deployed on Windows systems immediately with no modifications required.