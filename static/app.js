/**
 * CompPrice Bot - Client-Side Application
 * Competitive Intelligence & Price Analysis for GitHub Pages
 */

class CompPriceBot {
    constructor() {
        this.apiKey = localStorage.getItem('openai_api_key') || '';
        this.model = localStorage.getItem('openai_model') || 'gpt-4o';
        this.storageType = localStorage.getItem('storage_type') || 'localStorage';
        this.localDirectory = localStorage.getItem('local_directory') || '';
        this.processedFiles = [];
        this.competitiveData = [];
        this.matches = [];
        this.analytics = {
            daily: [],
            weekly: [],
            monthly: []
        };
        this.directoryWatcher = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadStoredData();
        this.updateDashboard();
    }

    setupEventListeners() {
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Configuration
        document.getElementById('configBtn').addEventListener('click', this.showConfig.bind(this));
        document.getElementById('saveConfig').addEventListener('click', this.saveConfig.bind(this));
        document.getElementById('cancelConfig').addEventListener('click', this.hideConfig.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    async processFiles(files) {
        console.log('Processing files:', files);
        
        for (const file of files) {
            if (this.isValidFile(file)) {
                await this.processFile(file);
            }
        }
        
        this.updateDashboard();
    }

    isValidFile(file) {
        const supportedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/json',
            'image/jpeg',
            'image/png',
            'image/tiff'
        ];

        const maxSize = 100 * 1024 * 1024; // 100MB

        if (file.size > maxSize) {
            this.showError(`File ${file.name} is too large (max 100MB)`);
            return false;
        }

        if (!supportedTypes.includes(file.type) && !this.hasValidExtension(file.name)) {
            this.showError(`File ${file.name} has unsupported format`);
            return false;
        }

        return true;
    }

    hasValidExtension(filename) {
        const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf', '.docx', '.doc', '.txt', '.json', '.jpg', '.jpeg', '.png', '.tiff'];
        return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    }

    async processFile(file) {
        const fileItem = this.addFileToList(file);
        
        try {
            this.updateFileStatus(fileItem, 'processing', 'Processing...');
            
            let extractedData;
            const extension = this.getFileExtension(file.name);
            
            switch (extension) {
                case '.csv':
                    extractedData = await this.parseCSV(file);
                    break;
                case '.xlsx':
                case '.xls':
                    extractedData = await this.parseExcel(file);
                    break;
                case '.json':
                    extractedData = await this.parseJSON(file);
                    break;
                case '.txt':
                    extractedData = await this.parseText(file);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${extension}`);
            }

            if (extractedData && extractedData.competitive_data && extractedData.competitive_data.length > 0) {
                this.competitiveData.push(...extractedData.competitive_data);
                await this.findMatches(extractedData.competitive_data);
                this.updateFileStatus(fileItem, 'success', `${extractedData.competitive_data.length} products found`);
            } else {
                this.updateFileStatus(fileItem, 'warning', 'No data found');
            }

            this.saveData();
            
        } catch (error) {
            console.error('Error processing file:', error);
            this.updateFileStatus(fileItem, 'error', error.message);
        }
    }

    async parseCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
                    
                    const competitiveData = [];
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim()) {
                            const values = this.parseCSVLine(lines[i]);
                            const product = {};
                            
                            headers.forEach((header, index) => {
                                if (values[index] && values[index].trim()) {
                                    product[this.mapColumnName(header)] = this.cleanValue(values[index]);
                                }
                            });
                            
                            if (Object.keys(product).length > 0) {
                                product.data_source = 'csv';
                                product.file_name = file.name;
                                competitiveData.push(product);
                            }
                        }
                    }
                    
                    resolve({
                        format: 'csv',
                        source: file.name,
                        competitive_data: competitiveData,
                        summary: this.generateSummary(competitiveData)
                    });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    async parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    
                    const competitiveData = jsonData.map(row => {
                        const product = {};
                        Object.entries(row).forEach(([key, value]) => {
                            if (value !== null && value !== undefined && value !== '') {
                                product[this.mapColumnName(key.toLowerCase())] = this.cleanValue(value);
                            }
                        });
                        product.data_source = 'excel';
                        product.file_name = file.name;
                        return product;
                    });
                    
                    resolve({
                        format: 'excel',
                        source: file.name,
                        competitive_data: competitiveData,
                        summary: this.generateSummary(competitiveData)
                    });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    async parseJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    let competitiveData = [];
                    
                    if (Array.isArray(jsonData)) {
                        competitiveData = jsonData.map(item => ({
                            ...item,
                            data_source: 'json',
                            file_name: file.name
                        }));
                    } else if (jsonData.data && Array.isArray(jsonData.data)) {
                        competitiveData = jsonData.data.map(item => ({
                            ...item,
                            data_source: 'json',
                            file_name: file.name
                        }));
                    }
                    
                    resolve({
                        format: 'json',
                        source: file.name,
                        competitive_data: competitiveData,
                        summary: this.generateSummary(competitiveData)
                    });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    async parseText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    // Simple text parsing - look for price patterns
                    const priceMatches = text.match(/\$[\d,]+\.?\d*/g) || [];
                    const productMatches = text.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
                    
                    const competitiveData = priceMatches.map((price, index) => ({
                        price: this.cleanValue(price),
                        product_name: productMatches[index] || `Product ${index + 1}`,
                        data_source: 'text',
                        file_name: file.name
                    }));
                    
                    resolve({
                        format: 'text',
                        source: file.name,
                        competitive_data: competitiveData,
                        summary: this.generateSummary(competitiveData)
                    });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    mapColumnName(column) {
        const mappings = {
            'product_name': ['product_name', 'name', 'title', 'description', 'product'],
            'price': ['price', 'cost', 'amount', 'list_price', 'retail_price', 'msrp'],
            'model_number': ['model_number', 'model', 'model_no', 'part_number', 'sku'],
            'brand': ['brand', 'manufacturer', 'make', 'vendor', 'supplier'],
            'category': ['category', 'type', 'product_type', 'class', 'group'],
            'tonnage': ['tonnage', 'capacity', 'tons', 'btu'],
            'seer': ['seer', 'efficiency', 'seer_rating'],
            'availability': ['availability', 'stock', 'in_stock', 'available']
        };

        for (const [standard, variations] of Object.entries(mappings)) {
            if (variations.includes(column)) {
                return standard;
            }
        }
        
        return column;
    }

    cleanValue(value) {
        if (typeof value === 'string') {
            value = value.trim().replace(/"/g, '');
            
            // Clean price values
            if (value.includes('$') || value.includes('€') || value.includes('£')) {
                const cleaned = value.replace(/[^0-9.]/g, '');
                const num = parseFloat(cleaned);
                return isNaN(num) ? value : num;
            }
            
            // Try to convert to number
            const num = parseFloat(value);
            if (!isNaN(num) && isFinite(num)) {
                return num;
            }
        }
        
        return value;
    }

    generateSummary(data) {
        const summary = {
            total_products: data.length,
            brands_found: [...new Set(data.map(d => d.brand).filter(Boolean))],
            categories_found: [...new Set(data.map(d => d.category).filter(Boolean))],
            price_range: {}
        };

        const prices = data.map(d => d.price).filter(p => typeof p === 'number' && p > 0);
        if (prices.length > 0) {
            summary.price_range = {
                min: Math.min(...prices),
                max: Math.max(...prices),
                avg: prices.reduce((a, b) => a + b, 0) / prices.length,
                count: prices.length
            };
        }

        return summary;
    }

    async findMatches(newData) {
        if (!this.apiKey) {
            console.warn('No OpenAI API key configured');
            return;
        }

        try {
            // Simple rule-based matching for demo
            const matches = [];
            
            for (const product of newData) {
                if (product.price && product.product_name) {
                    matches.push({
                        competitor_product: product,
                        match_score: 0.8,
                        price_difference: 0,
                        insights: `Found competitive product: ${product.product_name} at $${product.price}`
                    });
                }
            }
            
            this.matches.push(...matches);
            
        } catch (error) {
            console.error('Error finding matches:', error);
        }
    }

    addFileToList(file) {
        const fileList = document.getElementById('fileList');
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas fa-file-${this.getFileIcon(file.name)}"></i>
                </div>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <small>${this.formatFileSize(file.size)}</small>
                </div>
            </div>
            <div class="processing-status">
                <span class="status-text">Queued</span>
                <i class="fas fa-clock status-icon"></i>
            </div>
        `;
        fileList.appendChild(fileItem);
        return fileItem;
    }

    updateFileStatus(fileItem, status, message) {
        const statusText = fileItem.querySelector('.status-text');
        const statusIcon = fileItem.querySelector('.status-icon');
        
        statusText.textContent = message;
        
        switch (status) {
            case 'processing':
                statusIcon.className = 'fas fa-spinner fa-spin status-icon';
                break;
            case 'success':
                statusIcon.className = 'fas fa-check-circle status-icon';
                statusIcon.style.color = '#52c41a';
                break;
            case 'error':
                statusIcon.className = 'fas fa-exclamation-circle status-icon';
                statusIcon.style.color = '#f5222d';
                break;
            case 'warning':
                statusIcon.className = 'fas fa-exclamation-triangle status-icon';
                statusIcon.style.color = '#faad14';
                break;
        }
    }

    updateDashboard() {
        // Update statistics
        document.getElementById('totalProducts').textContent = this.competitiveData.length;
        document.getElementById('totalMatches').textContent = this.matches.length;
        
        const prices = this.competitiveData.map(d => d.price).filter(p => typeof p === 'number' && p > 0);
        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        document.getElementById('avgPrice').textContent = `$${avgPrice.toFixed(0)}`;
        
        const brands = [...new Set(this.competitiveData.map(d => d.brand).filter(Boolean))];
        document.getElementById('brandCount').textContent = brands.length;

        // Show/hide sections based on data
        const emptyState = document.getElementById('emptyState');
        const uploadSection = document.getElementById('uploadSection');
        const dashboard = document.getElementById('dashboard');
        
        if (this.competitiveData.length > 0) {
            emptyState.style.display = 'none';
            uploadSection.style.display = 'none';
            dashboard.style.display = 'block';
            this.renderMatches();
        } else {
            emptyState.style.display = 'block';
            uploadSection.style.display = 'block';
            dashboard.style.display = 'none';
        }
    }

    renderMatches() {
        const container = document.getElementById('matchesContainer');
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 class="section-title" style="margin: 0;"><i class="fas fa-bullseye"></i> Competitive Matches</h3>
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-secondary" onclick="compPriceBot.exportMatches('csv')" style="padding: 8px 16px;">
                        <i class="fas fa-download"></i> Export CSV
                    </button>
                    <button class="btn btn-secondary" onclick="compPriceBot.exportMatches('json')" style="padding: 8px 16px;">
                        <i class="fas fa-file-code"></i> Export JSON
                    </button>
                </div>
            </div>
            <div id="matchesList"></div>
            <div id="analyticsCharts" style="margin-top: 32px;"></div>
        `;
        
        const matchesList = document.getElementById('matchesList');
        
        if (this.matches.length === 0) {
            matchesList.innerHTML = `
                <div class="empty-state" style="padding: 40px;">
                    <div class="empty-icon" style="font-size: 60px;">
                        <i class="fas fa-search"></i>
                    </div>
                    <div class="empty-title">No Matches Found Yet</div>
                    <div class="empty-text">Upload competitive data files to start finding matches</div>
                </div>
            `;
            return;
        }
        
        this.matches.slice(0, 20).forEach((match, index) => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.innerHTML = `
                <div class="match-header">
                    <div>
                        <div class="match-title">${match.competitor_product.product_name || 'Unknown Product'}</div>
                        <div class="match-meta">
                            ${match.competitor_product.brand || 'Unknown Brand'} • 
                            ${match.competitor_product.category || 'Unknown Category'} •
                            ${match.competitor_product.file_name || 'Unknown Source'}
                        </div>
                    </div>
                    <div>
                        <div class="price-highlight">$${match.competitor_product.price || '0'}</div>
                        <div class="match-score">
                            <span style="color: ${this.getConfidenceColor(match.match_score)};">
                                ${(match.match_score * 100).toFixed(0)}% Match
                            </span>
                        </div>
                    </div>
                </div>
                <div class="match-insights">
                    <i class="fas fa-lightbulb" style="margin-right: 8px; color: #6366f1;"></i>
                    ${match.insights}
                </div>
                ${match.competitor_product.model_number ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
                        <strong>Model:</strong> ${match.competitor_product.model_number}
                        ${match.competitor_product.tonnage ? ` • <strong>Tonnage:</strong> ${match.competitor_product.tonnage}` : ''}
                        ${match.competitor_product.seer ? ` • <strong>SEER:</strong> ${match.competitor_product.seer}` : ''}
                    </div>
                ` : ''}
            `;
            matchesList.appendChild(matchCard);
        });
        
        this.renderAnalyticsCharts();
    }

    showConfig() {
        document.getElementById('apiKeyInput').value = this.apiKey;
        document.getElementById('modelSelect').value = this.model;
        document.getElementById('storageSelect').value = this.storageType;
        document.getElementById('directoryInput').value = this.localDirectory;
        document.getElementById('configModal').style.display = 'block';
    }

    hideConfig() {
        document.getElementById('configModal').style.display = 'none';
    }

    saveConfig() {
        this.apiKey = document.getElementById('apiKeyInput').value;
        this.model = document.getElementById('modelSelect').value;
        this.storageType = document.getElementById('storageSelect').value;
        this.localDirectory = document.getElementById('directoryInput').value;
        
        localStorage.setItem('openai_api_key', this.apiKey);
        localStorage.setItem('openai_model', this.model);
        localStorage.setItem('storage_type', this.storageType);
        localStorage.setItem('local_directory', this.localDirectory);
        
        this.configureStorage();
        this.setupLocalDirectoryMonitoring();
        
        this.hideConfig();
        this.showSuccess('Configuration saved!');
    }

    saveData() {
        const data = {
            competitiveData: this.competitiveData,
            matches: this.matches,
            analytics: this.analytics,
            timestamp: new Date().toISOString()
        };
        
        if (this.storageType === 'localStorage') {
            localStorage.setItem('comprice_data', JSON.stringify(data));
        } else if (this.storageType === 'csv') {
            this.autoExportCSV(data);
        } else if (this.storageType === 'json') {
            this.autoExportJSON(data);
        }
    }

    autoExportCSV(data) {
        if (data.matches.length > 0) {
            const filename = `comprice_matches_${new Date().toISOString().split('T')[0]}.csv`;
            this.downloadCSV(data.matches.map(match => ({
                product_name: match.competitor_product.product_name,
                brand: match.competitor_product.brand,
                price: match.competitor_product.price,
                category: match.competitor_product.category,
                match_score: match.match_score,
                timestamp: data.timestamp
            })), filename);
        }
    }

    autoExportJSON(data) {
        const filename = `comprice_data_${new Date().toISOString().split('T')[0]}.json`;
        this.downloadJSON(data, filename);
    }

    loadStoredData() {
        const stored = localStorage.getItem('comprice_data');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.competitiveData = data.competitiveData || [];
                this.matches = data.matches || [];
            } catch (error) {
                console.error('Error loading stored data:', error);
            }
        }
    }

    getFileExtension(filename) {
        return filename.toLowerCase().substring(filename.lastIndexOf('.'));
    }

    getFileIcon(filename) {
        const ext = this.getFileExtension(filename);
        const iconMap = {
            '.csv': 'csv',
            '.xlsx': 'excel',
            '.xls': 'excel',
            '.pdf': 'pdf',
            '.docx': 'word',
            '.doc': 'word',
            '.txt': 'alt',
            '.json': 'code',
            '.jpg': 'image',
            '.jpeg': 'image',
            '.png': 'image',
            '.tiff': 'image'
        };
        return iconMap[ext] || 'alt';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        console.error(message);
        // Could implement toast notifications here
    }

    showSuccess(message) {
        console.log(message);
        // Could implement toast notifications here
    }

    getConfidenceColor(score) {
        if (score >= 0.8) return '#059669'; // Green
        if (score >= 0.6) return '#d97706'; // Orange
        return '#dc2626'; // Red
    }

    renderAnalyticsCharts() {
        const container = document.getElementById('analyticsCharts');
        
        // Generate sample analytics data
        const priceData = this.generatePriceAnalytics();
        const trendData = this.generateTrendData();
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
                <div class="glass-morphism" style="padding: 24px;">
                    <h4 style="margin: 0 0 16px 0; color: #1f2937;">Price Distribution</h4>
                    <div id="priceChart" style="height: 200px; display: flex; align-items: end; gap: 8px; justify-content: center;">
                        ${priceData.map(data => `
                            <div style="display: flex; flex-direction: column; align-items: center;">
                                <div style="width: 40px; height: ${data.height}px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 4px 4px 0 0;"></div>
                                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${data.label}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="glass-morphism" style="padding: 24px;">
                    <h4 style="margin: 0 0 16px 0; color: #1f2937;">Weekly Trends</h4>
                    <div id="trendChart" style="height: 200px; display: flex; align-items: end; gap: 4px;">
                        ${trendData.map(data => `
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                                <div style="width: 100%; height: ${data.height}px; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border-radius: 2px;"></div>
                                <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">${data.day}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    generatePriceAnalytics() {
        const prices = this.competitiveData.map(d => d.price).filter(p => typeof p === 'number' && p > 0);
        if (prices.length === 0) return [];

        const ranges = [
            { label: '$0-1K', min: 0, max: 1000 },
            { label: '$1-3K', min: 1000, max: 3000 },
            { label: '$3-5K', min: 3000, max: 5000 },
            { label: '$5K+', min: 5000, max: Infinity }
        ];

        return ranges.map(range => {
            const count = prices.filter(p => p >= range.min && p < range.max).length;
            return {
                label: range.label,
                count: count,
                height: Math.max(20, (count / prices.length) * 160)
            };
        });
    }

    generateTrendData() {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map(day => ({
            day: day,
            height: Math.floor(Math.random() * 120) + 20
        }));
    }

    exportMatches(format) {
        if (this.matches.length === 0) {
            this.showError('No matches to export');
            return;
        }

        const data = this.matches.map(match => ({
            product_name: match.competitor_product.product_name,
            brand: match.competitor_product.brand,
            price: match.competitor_product.price,
            category: match.competitor_product.category,
            model_number: match.competitor_product.model_number,
            match_score: match.match_score,
            insights: match.insights,
            source_file: match.competitor_product.file_name,
            timestamp: new Date().toISOString()
        }));

        if (format === 'csv') {
            this.downloadCSV(data, 'competitive_matches.csv');
        } else if (format === 'json') {
            this.downloadJSON(data, 'competitive_matches.json');
        }
    }

    downloadCSV(data, filename) {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');

        this.downloadFile(csvContent, filename, 'text/csv');
    }

    downloadJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async setupLocalDirectoryMonitoring() {
        if (!this.localDirectory) {
            console.warn('No local directory configured');
            return;
        }

        // In a real implementation, this would use File System Access API
        // For now, we'll simulate directory monitoring
        console.log(`Monitoring directory: ${this.localDirectory}`);
    }

    async configureStorage() {
        // Storage configuration logic
        const storage = {
            type: this.storageType,
            directory: this.localDirectory,
            lastSync: new Date().toISOString()
        };
        
        localStorage.setItem('storage_config', JSON.stringify(storage));
        console.log('Storage configured:', storage);
    }
}

// Global reference for button callbacks
let compPriceBot;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    compPriceBot = new CompPriceBot();
});