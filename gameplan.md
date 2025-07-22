# HVAC SKU Crosswalk Desktop App - Ultra-Detailed Gameplan

## ⚠️ CODE ORGANIZATION PRINCIPLES
- **EVERY file has a proper place** - no loose files in root directories
- **Test files** go in `__tests__` folders next to the code they test
- **Utilities** are shared and reusable - no duplicate code
- **Clear separation** between main/renderer processes
- **Consistent naming** - camelCase for files, PascalCase for components
- **Documentation** lives with code - JSDoc comments required

## Project Overview
Desktop application that creates SKU crosswalks between YOUR HVAC products and competitor products. Given competitor data (SKU, price, company name), the app intelligently matches to your equivalent products using AI and industry specifications.

## What This App Does
1. **Input**: Competitor files with their SKU, price, and company name
2. **Process**: Match competitor SKUs to YOUR equivalent products
3. **Output**: Crosswalk table showing which competitor SKU = which of your SKUs
4. **Store**: Save mappings for future use and build knowledge base

## Complete Project Structure
```
comp-price-bot/                # Our root directory
├── .github/
│   └── workflows/          # CI/CD pipelines
│       ├── test.yml
│       └── release.yml
├── docs/
│   ├── API.md              # API documentation
│   ├── SETUP.md            # Setup instructions
│   └── USER_GUIDE.md       # End-user documentation
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.ts        # Entry point
│   │   ├── windows/        # Window management
│   │   │   └── mainWindow.ts
│   │   ├── database/       # Database layer
│   │   │   ├── connection.ts
│   │   │   ├── migrations/
│   │   │   │   └── 001_initial.sql
│   │   │   └── repositories/
│   │   │       ├── products.repo.ts
│   │   │       ├── mappings.repo.ts
│   │   │       └── history.repo.ts
│   │   ├── services/       # Business logic
│   │   │   ├── apiKey.service.ts
│   │   │   ├── fileWatcher.service.ts
│   │   │   └── autoUpdater.service.ts
│   │   ├── ipc/            # IPC handlers
│   │   │   ├── handlers/
│   │   │   │   ├── file.handler.ts
│   │   │   │   ├── database.handler.ts
│   │   │   │   └── settings.handler.ts
│   │   │   └── channels.ts
│   │   └── __tests__/      # Main process tests
│   ├── renderer/           # React frontend
│   │   ├── index.tsx       # React entry
│   │   ├── App.tsx         # Root component
│   │   ├── components/     # UI components
│   │   │   ├── common/     # Shared components
│   │   │   │   ├── Button/
│   │   │   │   ├── Modal/
│   │   │   │   └── Table/
│   │   │   ├── layout/     # Layout components
│   │   │   │   ├── Header/
│   │   │   │   ├── Sidebar/
│   │   │   │   └── MainLayout/
│   │   │   └── features/   # Feature components
│   │   │       ├── Settings/
│   │   │       │   ├── Settings.tsx
│   │   │       │   ├── ApiKeyInput.tsx
│   │   │       │   └── __tests__/
│   │   │       ├── Products/
│   │   │       │   ├── ProductList.tsx
│   │   │       │   ├── ProductImport.tsx
│   │   │       │   └── __tests__/
│   │   │       ├── Crosswalk/
│   │   │       │   ├── CrosswalkTable.tsx
│   │   │       │   ├── MappingEditor.tsx
│   │   │       │   ├── ConfidenceIndicator.tsx
│   │   │       │   └── __tests__/
│   │   │       └── History/
│   │   │           ├── ProcessingHistory.tsx
│   │   │           └── __tests__/
│   │   ├── services/       # Frontend services
│   │   │   ├── api/        # IPC communication
│   │   │   │   ├── client.ts
│   │   │   │   └── types.ts
│   │   │   ├── openai/     # AI integration
│   │   │   │   ├── client.ts
│   │   │   │   ├── prompts.ts
│   │   │   │   └── __tests__/
│   │   │   └── matching/   # Matching logic
│   │   │       ├── engine.ts
│   │   │       ├── strategies/
│   │   │       │   ├── exact.strategy.ts
│   │   │       │   ├── model.strategy.ts
│   │   │       │   └── specs.strategy.ts
│   │   │       └── __tests__/
│   │   ├── hooks/          # Custom React hooks
│   │   │   ├── useProducts.ts
│   │   │   ├── useMappings.ts
│   │   │   └── __tests__/
│   │   ├── store/          # State management
│   │   │   ├── store.ts
│   │   │   └── slices/
│   │   │       ├── products.slice.ts
│   │   │       ├── mappings.slice.ts
│   │   │       └── ui.slice.ts
│   │   ├── styles/         # Global styles
│   │   │   └── globals.css
│   │   └── utils/          # Frontend utilities
│   │       ├── formatters.ts
│   │       ├── validators.ts
│   │       └── __tests__/
│   ├── shared/             # Shared between main/renderer
│   │   ├── types/          # TypeScript types
│   │   │   ├── product.types.ts
│   │   │   ├── mapping.types.ts
│   │   │   └── ipc.types.ts
│   │   ├── constants/      # Shared constants
│   │   │   ├── brands.ts
│   │   │   └── hvac.ts
│   │   └── utils/          # Shared utilities
│   │       └── hvacParser.ts
│   └── preload/            # Preload scripts
│       └── index.ts
├── scripts/                # Build/dev scripts
│   ├── notarize.js
│   └── clean.js
├── assets/                 # Static assets
│   ├── icons/
│   └── images/
├── tests/                  # E2E tests
│   ├── e2e/
│   └── fixtures/
├── gameplan.md             # Our existing gameplan
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── jest.config.js
├── tsconfig.json
├── electron-builder.yml
└── package.json
```

## Development Phases

### Phase 1: Foundation
**Goal**: Basic Electron app with database and file handling

#### Day 1-2: Project Setup
- [x] Initialize Electron + React + TypeScript
- [x] Configure build tools (Webpack/Vite)
- [x] Setup ESLint, Prettier, Jest
- [x] Create folder structure
- [x] Setup cross-platform development scripts (dev.sh/dev.bat)

#### Day 3-4: Database Layer
- [x] SQLite integration
- [x] Create schema migrations
- [x] Repository pattern implementation
- [x] Basic CRUD operations
- [x] Database connection management

#### Day 5-7: Core Infrastructure
- [x] IPC communication setup
- [x] Basic window management
- [x] File system operations
- [x] Settings storage (electron-store)
- [x] Basic UI layout (Header, Sidebar, Main)

**Deliverable**: App launches, can read files, store data

### Phase 2: Product Management
**Goal**: Import and manage your product catalog

#### Day 1-3: Product Import
- [ ] CSV/Excel parser for product lists
- [ ] Product validation logic
- [ ] Bulk import UI
- [ ] Error handling and reporting

#### Day 4-5: Product UI
- [ ] Product list table with sorting/filtering
- [ ] Product detail view
- [ ] Edit/Delete operations
- [ ] Search functionality

#### Day 6-7: Testing & Polish
- [ ] Unit tests for parsers
- [ ] Integration tests for database
- [ ] UI polish and loading states
- [ ] Performance optimization

**Deliverable**: Can import and manage your product catalog

### Phase 3: AI Integration & Matching
**Goal**: Implement intelligent SKU matching

#### Day 1-2: OpenAI Setup
- [ ] API key management UI
- [ ] Secure storage implementation
- [ ] OpenAI client wrapper
- [ ] Rate limiting logic

#### Day 3-4: Matching Engine
- [ ] Exact match strategy
- [ ] Model number matching
- [ ] Specification matching (tonnage, SEER)
- [ ] Confidence scoring algorithm

#### Day 5-6: Crosswalk UI
- [ ] File drop zone for competitor data
- [ ] Processing progress indicator
- [ ] Results table with confidence scores
- [ ] Manual override interface

#### Day 7: Integration Testing
- [ ] Test with real HVAC data
- [ ] Tune matching algorithms
- [ ] Handle edge cases

**Deliverable**: Can process competitor files and suggest matches

### Phase 4: Advanced Features
**Goal**: Historical tracking and automation

#### Day 1-2: History & Analytics
- [ ] Processing history log
- [ ] Success rate metrics
- [ ] Mapping statistics
- [ ] Export functionality

#### Day 3-4: Automation
- [ ] Folder watching
- [ ] Auto-processing rules
- [ ] Batch processing
- [ ] Scheduled imports

#### Day 5-6: Knowledge Base
- [ ] Learn from confirmed mappings
- [ ] Improve future suggestions
- [ ] Company-specific patterns
- [ ] Mapping templates

#### Day 7: Performance
- [ ] Caching layer
- [ ] Background processing
- [ ] Database optimization
- [ ] Memory management

**Deliverable**: Production-ready with automation

### Phase 5: Polish & Packaging
**Goal**: Professional release

#### Day 1-2: UI/UX Polish
- [ ] Consistent design system
- [ ] Keyboard shortcuts
- [ ] Tooltips and help text
- [ ] Error messages

#### Day 3-4: Packaging
- [ ] Windows installer (NSIS)
- [ ] Mac installer (DMG)
- [ ] Auto-updater setup
- [ ] Code signing

#### Day 5-6: Documentation
- [ ] User manual
- [ ] Video tutorials
- [ ] API documentation
- [ ] Deployment guide

#### Day 7: Release
- [ ] Final testing
- [ ] Release builds
- [ ] GitHub releases
- [ ] Update server setup

**Deliverable**: Installable app with documentation

## Core Functionality Details

### SKU Matching Algorithm
```typescript
// src/renderer/services/matching/engine.ts
export class CrosswalkEngine {
  async matchCompetitorProduct(
    competitorData: {
      sku: string;
      company: string;
      price: number;
      description?: string;
    },
    ourProducts: Product[]
  ): Promise<MatchResult[]> {
    // 1. Check existing mappings
    const existingMapping = await this.checkExistingMapping(
      competitorData.sku,
      competitorData.company
    );
    
    if (existingMapping) {
      return [{
        ourSku: existingMapping.ourSku,
        confidence: 1.0,
        method: 'existing_mapping'
      }];
    }
    
    // 2. Try multiple matching strategies
    const results = await Promise.all([
      this.exactMatch(competitorData, ourProducts),
      this.modelMatch(competitorData, ourProducts),
      this.specMatch(competitorData, ourProducts),
      this.aiMatch(competitorData, ourProducts)
    ]);
    
    // 3. Combine and rank results
    return this.rankResults(results.flat());
  }
}
```

### Database Schema
```sql
-- Your product catalog
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  brand TEXT NOT NULL,
  type TEXT NOT NULL,
  tonnage REAL,
  seer REAL,
  seer2 REAL,
  afue REAL,
  hspf REAL,
  refrigerant TEXT,
  stage TEXT, -- 'single', 'two-stage', 'variable'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Competitor SKU mappings
CREATE TABLE mappings (
  id INTEGER PRIMARY KEY,
  our_sku TEXT NOT NULL,
  competitor_sku TEXT NOT NULL,
  competitor_company TEXT NOT NULL,
  confidence REAL NOT NULL,
  match_method TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(competitor_sku, competitor_company)
);

-- Processing history
CREATE TABLE processing_history (
  id INTEGER PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  company_name TEXT NOT NULL,
  total_items INTEGER,
  matched_items INTEGER,
  unmatched_items INTEGER,
  processing_time_ms INTEGER,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Competitor data cache
CREATE TABLE competitor_data (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL,
  company TEXT NOT NULL,
  price DECIMAL(10,2),
  description TEXT,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sku, company)
);
```

### OpenAI Integration for Matching
```typescript
// src/renderer/services/openai/prompts.ts
export const CROSSWALK_PROMPT = `
You are an HVAC equipment specialist. Match this competitor product to our products.

Competitor Product:
- SKU: {competitorSku}
- Company: {competitorCompany}
- Description: {description}

Our Products:
{ourProducts}

Consider:
1. Model numbers often have brand prefixes
2. Same tonnage is critical for AC/Heat Pump matching
3. SEER ratings within 1-2 points are equivalent
4. For furnaces, AFUE within 2% is equivalent
5. Stage type (single/two/variable) should match

Return the best match with confidence score (0-1) and reasoning.
`;
```

## Key Architecture Decisions

1. **Electron + React**: Proven stack for desktop apps
2. **SQLite**: Zero-config database perfect for desktop
3. **IPC Pattern**: Clean separation between main/renderer
4. **Repository Pattern**: Clean data access layer
5. **Strategy Pattern**: Extensible matching algorithms
6. **electron-store**: Secure settings storage

## Success Metrics

- Match accuracy >95% for exact SKUs
- Match accuracy >85% for equivalent products
- Process 1000 SKUs in <60 seconds
- <50MB memory usage
- 5-second startup time

## Security & Privacy

- API keys encrypted with safeStorage
- All data stored locally
- No telemetry or cloud sync
- Input validation on all file imports

## Updated Project Vision (January 2025)

### Key Clarifications & Changes

**Database Purpose Clarified**: The database is NOT for storing your product catalog - it's specifically for **SKU crosswalk mappings** between competitor products and your products, including:
- Competitor SKU + Company + Price + Price Date
- Your equivalent SKU + Model 
- Match confidence scores and verification status
- Historical pricing data with timestamps

**Universal File Input**: The application must handle **literally any file type**:
- Traditional: CSV, Excel, PDF
- Images: JPG, PNG, TIFF (price sheets, catalogs, photos)
- Email: .MSG, .EML (quotes, price lists from suppliers)
- Documents: Word docs, text files, HTML
- Archives: ZIP, RAR files containing multiple documents
- **AI-powered extraction** from all formats using OCR + OpenAI

**Core Workflow**:
1. **Input**: ANY file type containing competitor pricing/product data
2. **Extract**: AI + OCR extracts SKU, company, price, product info
3. **Match**: AI matches competitor products to your equivalent SKUs
4. **Review**: Manual verification and correction interface
5. **Store**: Save verified mappings to crosswalk database with timestamps

### Architecture Updates

**File Processing Pipeline**:
```typescript
// Universal file handler supports ALL formats
interface FileProcessor {
  processFile(file: File): Promise<ExtractedData[]>;
  supportedTypes: 'ALL'; // Literally everything
  
  // Processing strategies by type:
  handleSpreadsheet(file): ExtractedData[];  // Direct parsing
  handlePDF(file): ExtractedData[];          // Text extraction
  handleImage(file): ExtractedData[];        // OCR processing
  handleEmail(file): ExtractedData[];        // Email content parsing
  handleArchive(file): ExtractedData[];      // Extract + process contents
  handleDocument(file): ExtractedData[];     // Text/content parsing
  handleUnknown(file): ExtractedData[];      // AI-powered content analysis
}
```

**Database Schema Focus**:
```sql
-- PRIMARY TABLE: Competitor SKU mappings (not product catalog)
CREATE TABLE crosswalk_mappings (
  id INTEGER PRIMARY KEY,
  competitor_sku TEXT NOT NULL,
  competitor_company TEXT NOT NULL,
  competitor_price DECIMAL(10,2),
  competitor_price_date DATE,         -- Key addition: price timestamp
  our_sku TEXT NOT NULL,
  our_model TEXT NOT NULL,
  confidence REAL NOT NULL,
  match_method TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(competitor_sku, competitor_company)
);

-- SECONDARY: Historical pricing for trend analysis
CREATE TABLE price_history (
  id INTEGER PRIMARY KEY,
  competitor_sku TEXT NOT NULL,
  competitor_company TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  price_date DATE NOT NULL,
  source_file TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Phase 1 Completion Status ✅

### Recently Completed
- [x] **SKU Database Page**: Complete crosswalk mapping interface with editable table
- [x] **Universal File Upload**: Comprehensive file handler supporting ALL file types
- [x] **Professional UI Polish**: Removed emojis, improved spacing, professional design
- [x] **File Processing Simulation**: Mock AI extraction for different file types
- [x] **Progress Tracking**: Real-time upload progress with status indicators

### Current State
- ✅ Core infrastructure complete
- ✅ Database designed for crosswalk mappings (not product catalog)
- ✅ Universal file input system ready
- ✅ Professional UI with proper spacing and design
- ✅ SKU crosswalk database interface implemented

## Final Cleanup Items

### UI Polish Tasks
- [ ] Remove hardcoded badge "3" from Crosswalk sidebar item (currently in `src/renderer/components/layout/Sidebar/Sidebar.tsx:110`) - should be dynamic based on actual pending mappings
- [x] Fixed checkbox spacing in Settings: increased gap to 16px and added 2 spaces before "Enable automatic processing" text

### Technical Debt
- [ ] Replace mock file processing with actual implementations in Phase 2
- [ ] Implement real database connection (currently using mock data)
- [ ] Add IPC handlers for file processing operations

## Next Phase Priorities

**Phase 2 Focus**: Real file processing implementation
- PDF text extraction libraries
- OCR libraries for image processing  
- MSG/EML email parsing
- OpenAI integration for intelligent content understanding
- Real database operations replacing mock data