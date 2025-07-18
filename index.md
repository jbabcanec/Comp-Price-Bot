---
layout: default
title: CompPrice Bot - Competitive Intelligence
---

# CompPrice Bot
## Competitive Intelligence & Price Analysis

<div style="text-align: center; margin: 20px 0;">
  <a href="static/" style="display: inline-block; padding: 12px 24px; background: #1890ff; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
    🚀 Launch Application
  </a>
</div>

---

## Features

### 📊 **Intelligent Data Processing**
- **Multi-Format Support**: CSV, Excel, PDF, Word documents, images, and JSON
- **Smart Column Mapping**: Automatically detects and maps common data fields
- **Flexible Parsing**: Handles various CSV dialects and data structures

### 🎯 **Competitive Analysis**
- **AI-Powered Matching**: Uses OpenAI to find competitive product matches
- **Price Intelligence**: Analyze competitor pricing strategies
- **Brand & Category Analysis**: Track market segments and competitors

### 🌐 **GitHub Pages Ready**
- **Client-Side Processing**: Runs entirely in your browser
- **No Server Required**: Perfect for GitHub Pages static hosting
- **Local Data Storage**: Your data stays in your browser

### 🔒 **Privacy First**
- **No Data Upload**: Files are processed locally in your browser
- **API Key Security**: Your OpenAI key is stored securely in your browser
- **Local Storage**: All data remains on your device

---

## Quick Start

1. **Launch the Application**: Click the "Launch Application" button above
2. **Configure API Key**: Click the config button and enter your OpenAI API key
3. **Upload Files**: Drag and drop your competitive data files
4. **View Analytics**: Analyze results in the dashboard

---

## Supported File Formats

| Format | Extensions | Description |
|--------|------------|-------------|
| **CSV** | `.csv` | Spreadsheet data with automatic column mapping |
| **Excel** | `.xlsx`, `.xls` | Microsoft Excel workbooks |
| **PDF** | `.pdf` | Competitor catalogs and price lists |
| **Word** | `.docx`, `.doc` | Product specifications and proposals |
| **Images** | `.jpg`, `.png`, `.tiff` | Screenshots and catalog pages |
| **JSON** | `.json` | Structured data exports |
| **Text** | `.txt` | Plain text with price extraction |

---

## CSV Data Format

Your competitive data should include columns like:

```csv
product_name,model_number,price,brand,category,tonnage,seer,availability
"3-Ton AC Unit","AC-3T-16S",2500.00,"Competitor A","Air Conditioner",3,16,"In Stock"
"Heat Pump 2T","HP-2T-18S",3200.00,"Competitor B","Heat Pump",2,18,"Limited"
```

The system automatically maps common column variations:
- **Product**: `product_name`, `name`, `title`, `description`
- **Price**: `price`, `cost`, `amount`, `list_price`, `msrp`
- **Model**: `model_number`, `model`, `sku`, `part_number`
- **Brand**: `brand`, `manufacturer`, `make`, `vendor`

---

## Privacy & Security

- ✅ **Local Processing**: All file processing happens in your browser
- ✅ **No Server Upload**: Files never leave your device
- ✅ **Secure Storage**: API keys stored locally with browser security
- ✅ **No Tracking**: No analytics or user tracking
- ✅ **Open Source**: Full source code available for review

---

## Technical Architecture

This application runs entirely client-side using:
- **Vanilla JavaScript**: No frameworks, pure performance
- **Web APIs**: FileReader, localStorage for local processing
- **External Libraries**: 
  - `xlsx.js` for Excel file processing
  - `pdf.js` for PDF text extraction
  - OpenAI API for competitive analysis

---

## Development

For developers interested in the full application architecture:

- **Backend**: FastAPI with Docker deployment (see `/backend` folder)
- **Frontend**: React.js for advanced features (see `/frontend` folder)
- **Static Version**: This GitHub Pages version (see `/static` folder)

---

## License

**Proprietary Software** - Copyright © 2024 Joseph Babcanec

This software is proprietary and confidential. All rights reserved.

---

## Contact

**Joseph Babcanec**  
📧 [joseph.babz@gmail.com](mailto:joseph.babz@gmail.com)  
🐙 [GitHub](https://github.com/jbabcanec)

---

<div style="text-align: center; margin-top: 40px;">
  <a href="static/" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px;">
    🚀 Start Analyzing Competitive Data
  </a>
</div>