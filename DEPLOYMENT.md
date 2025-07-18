# 🚀 CompPrice Bot - Deployment Guide

## **Deployable Web Application for Competitive Intelligence**

This guide covers deploying CompPrice Bot as a web application that can monitor local folders and process competitive data automatically.

---

## 🎯 **Deployment Options**

### **Option 1: Docker Deployment (Recommended)**

#### **Prerequisites**
- Docker and Docker Compose installed
- Local folder with competitive data (CSV, Excel, PDF, etc.)
- OpenAI API key

#### **Quick Start**
```bash
# 1. Clone the repository
git clone https://github.com/jbabcanec/Comp-Price-Bot.git
cd Comp-Price-Bot

# 2. Configure environment
cp .env.example .env
# Edit .env with your OpenAI API key

# 3. Set your data folder path
export DATA_PATH="/path/to/your/competitive/data"

# 4. Deploy with Docker Compose
docker-compose up -d
```

#### **Custom Data Path**
```bash
# Windows
set DATA_PATH=C:\Users\YourName\CompetitiveData
docker-compose up -d

# macOS/Linux
export DATA_PATH="/Users/YourName/CompetitiveData"
docker-compose up -d

# Or edit docker-compose.yml directly
# volumes:
#   - "C:/Users/YourName/CompetitiveData:/app/data"
```

### **Option 2: Cloud Deployment**

#### **AWS ECS/Fargate**
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker build -t comprice-bot .
docker tag comprice-bot:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/comprice-bot:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/comprice-bot:latest

# Deploy with ECS task definition
aws ecs create-service --cluster comprice --service-name comprice-bot --task-definition comprice-bot:1 --desired-count 1
```

#### **Google Cloud Run**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/your-project/comprice-bot
gcloud run deploy --image gcr.io/your-project/comprice-bot --platform managed --allow-unauthenticated
```

#### **Azure Container Instances**
```bash
# Build and push to ACR
az acr build --registry myregistry --image comprice-bot .
az container create --resource-group myResourceGroup --name comprice-bot --image myregistry.azurecr.io/comprice-bot:latest
```

---

## 📁 **Data Folder Setup**

### **Supported File Formats**
- **CSV Files**: Competitive pricing sheets, product catalogs
- **Excel Files**: .xlsx, .xls spreadsheets
- **PDF Files**: Competitor catalogs, price lists
- **Word Documents**: Product specifications, proposals
- **Images**: Screenshots, catalog pages (with OCR)
- **JSON Files**: API exports, structured data

### **Folder Structure**
```
/your/data/folder/
├── competitors/
│   ├── acme-pricing-2024.csv
│   ├── competitor-catalog.pdf
│   └── market-analysis.xlsx
├── products/
│   ├── our-catalog.csv
│   └── product-specs.json
└── archive/
    └── old-data/
```

### **CSV Format Requirements**
Your competitive data CSV should include columns like:
```csv
product_name,model_number,price,brand,category,tonnage,seer,availability
"3-Ton AC Unit","AC-3T-16S",2500.00,"Competitor A","Air Conditioner",3,16,"In Stock"
"Heat Pump 2T","HP-2T-18S",3200.00,"Competitor B","Heat Pump",2,18,"Limited"
```

**Flexible Column Names** - The system automatically maps common variations:
- Product: `product_name`, `name`, `title`, `description`, `product`
- Price: `price`, `cost`, `amount`, `list_price`, `retail_price`, `msrp`
- Model: `model_number`, `model`, `model_no`, `part_number`, `sku`
- Brand: `brand`, `manufacturer`, `make`, `vendor`, `supplier`

---

## ⚙️ **Configuration**

### **Environment Variables**
```bash
# Required
OPENAI_API_KEY=sk-your-api-key-here

# Optional
ENVIRONMENT=production
PORT=8080
DATA_WATCH_ENABLED=true
AUTO_PROCESS=true
LOG_LEVEL=INFO
MAX_FILE_SIZE_MB=100
BATCH_SIZE=10
MAX_CONCURRENT_JOBS=5
```

### **Advanced Configuration**
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  comprice-bot:
    environment:
      - DATA_WATCH_ENABLED=true
      - AUTO_PROCESS=true
      - SUPPORTED_FORMATS=.csv,.xlsx,.pdf,.docx,.jpg,.png
      - REDIS_URL=redis://redis:6379
    volumes:
      # Mount multiple data sources
      - "${DATA_PATH_1}:/app/data/source1"
      - "${DATA_PATH_2}:/app/data/source2"
      # Custom configuration
      - "./custom-config.json:/app/config/custom.json"
```

---

## 🌐 **Web Interface**

### **Access the Application**
- **Local**: http://localhost:8080
- **Production**: https://your-domain.com

### **Main Features**
1. **Dashboard**: Real-time analytics and insights
2. **File Upload**: Manual file processing
3. **Data Explorer**: Browse processed competitive data
4. **Settings**: Configure API keys and processing options
5. **Monitoring**: View file processing status and logs

### **API Endpoints**
- `GET /health` - Health check
- `GET /api/files` - List processed files
- `POST /api/files/upload` - Upload files manually
- `GET /api/matches` - Get competitive matches
- `GET /api/analytics` - Dashboard data
- `POST /api/config` - Update configuration

---

## 📊 **Monitoring & Management**

### **Health Checks**
```bash
# Check application health
curl http://localhost:8080/health

# Check specific components
curl http://localhost:8080/api/system/status
```

### **Logs**
```bash
# View logs
docker-compose logs -f comprice-bot

# Check specific log levels
docker-compose logs -f comprice-bot | grep ERROR
```

### **Data Management**
```bash
# Backup data
docker run --rm -v comprice_db:/data -v $(pwd):/backup alpine tar czf /backup/comprice-backup.tar.gz /data

# Restore data
docker run --rm -v comprice_db:/data -v $(pwd):/backup alpine tar xzf /backup/comprice-backup.tar.gz -C /
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **File Not Processing**
1. Check file format is supported
2. Verify file size < 100MB
3. Check data folder permissions
4. Review logs for specific errors

#### **No Matches Found**
1. Verify OpenAI API key is configured
2. Check if your product catalog is loaded
3. Review competitive data format
4. Adjust matching sensitivity in settings

#### **Performance Issues**
1. Reduce batch size in environment variables
2. Limit concurrent jobs
3. Add more memory to container
4. Enable Redis caching

### **Debug Mode**
```bash
# Run in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Access debug endpoints
curl http://localhost:8080/api/debug/files
curl http://localhost:8080/api/debug/processing-queue
```

---

## 🚀 **Production Deployment**

### **Security Checklist**
- [ ] Change default passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Backup strategy implemented

### **Performance Optimization**
- [ ] Enable Redis caching
- [ ] Configure CDN for static assets
- [ ] Set up load balancing
- [ ] Monitor resource usage
- [ ] Optimize database queries

### **Monitoring Setup**
```yaml
# monitoring/docker-compose.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## 📞 **Support**

For deployment issues or questions:
- Check the logs first: `docker-compose logs -f`
- Review the troubleshooting section above
- Open an issue on GitHub with detailed error information
- Include your environment configuration and log snippets

---

**🎉 You're ready to deploy CompPrice Bot as a robust web application!**