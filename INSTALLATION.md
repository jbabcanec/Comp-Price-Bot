# HVAC Price Analyzer - Installation Guide

## Quick Installation

### Option 1: Pre-built Executables (Recommended)
Download the appropriate file for your platform from the [Releases page](../../releases):

#### Windows
- **Installer**: `HVAC-Price-Analyzer-Setup-*.exe` - Run to install
- **Portable**: `HVAC-Price-Analyzer-*.exe` - No installation required

#### macOS
- **Installer**: `HVAC-Price-Analyzer-*.dmg` - Double-click to install
- **Portable**: `HVAC-Price-Analyzer-darwin-*.zip` - Extract and run

#### Linux
- **Portable**: `HVAC-Price-Analyzer-*.AppImage` - Make executable and run
- **Debian/Ubuntu**: `hvac-price-analyzer_*_amd64.deb` - Install with dpkg

### Option 2: Manual Installation from ZIP

1. Download the appropriate ZIP file for your platform
2. Extract to your desired location
3. Run the installation script:

#### Windows
```cmd
install.bat
```

#### macOS/Linux
```bash
./install.sh
```

#### Or manually:
```bash
npm install
npm run rebuild
npm run build
npm start
```

## Requirements

- **Node.js**: Version 16 or higher
- **npm**: Usually comes with Node.js
- **Operating System**: Windows 10+, macOS 10.15+, or Linux

## Installation Steps (Manual)

### 1. Install Node.js
If you don't have Node.js installed:
- Visit [nodejs.org](https://nodejs.org/)
- Download and install the LTS version
- Verify installation: `node --version` and `npm --version`

### 2. Extract the Application
```bash
# Extract the downloaded ZIP file
unzip HVAC-Price-Analyzer-*.zip
cd HVAC-Price-Analyzer
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Rebuild Native Modules
```bash
npm run rebuild
```

### 5. Build the Application
```bash
npm run build
```

### 6. Run the Application
```bash
npm start
```

## Available Commands

- `npm start` - Run the application
- `npm run dev` - Run in development mode with hot reload
- `npm test` - Run the test suite
- `npm run lint` - Check code quality
- `npm run typecheck` - Check TypeScript types
- `npm run rebuild` - Rebuild native modules

## Troubleshooting

### Common Issues

#### 1. SQLite3 Native Module Error
```
Error: dlopen(...node_sqlite3.node, 0x0001): tried: '...' (not a mach-o file)
```
**Solution**: Run `npm run rebuild` to rebuild native modules for your platform.

#### 2. Permission Denied (macOS/Linux)
```
Permission denied: ./install.sh
```
**Solution**: Make the script executable: `chmod +x install.sh`

#### 3. Node.js Version Issues
```
The engine "node" is incompatible with this module
```
**Solution**: Update to Node.js 16 or higher.

#### 4. Network/Proxy Issues
```
npm ERR! network request to https://registry.npmjs.org/ failed
```
**Solution**: 
- Check your internet connection
- Configure npm proxy if behind corporate firewall
- Try: `npm install --verbose` for more details

### Getting Help

1. Check the [Issues page](../../issues) for known problems
2. Create a new issue with:
   - Your operating system and version
   - Node.js and npm versions
   - Complete error message
   - Steps to reproduce

## Development Setup

For developers who want to contribute:

```bash
# Clone the repository
git clone <repository-url>
cd comp-price-bot

# Install dependencies
npm install

# Start development mode
npm run dev

# Run tests
npm test

# Check code quality
npm run lint
npm run typecheck
```

## Building Distributables

To create your own distributables:

```bash
# Build for current platform
npm run package

# Build for specific platforms
npm run package:win
npm run package:mac
npm run package:linux

# Build for all platforms
npm run package:all
```

## System Requirements

### Minimum Requirements
- **RAM**: 4GB
- **Storage**: 500MB free space
- **CPU**: Any modern processor (2015+)

### Recommended Requirements
- **RAM**: 8GB or more
- **Storage**: 1GB free space
- **CPU**: Multi-core processor for better performance

## Security Notes

- The application requires network access for AI processing
- Database files are stored locally on your machine
- No data is transmitted without your explicit action
- OpenAI API key is stored securely in your system keychain

## License

This project is licensed under the MIT License - see the LICENSE file for details.