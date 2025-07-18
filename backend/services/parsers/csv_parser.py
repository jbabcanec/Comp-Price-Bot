"""
Robust CSV parser for competitive data
Handles various CSV formats and structures
"""

import logging
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import chardet
import csv

from backend.core.config import get_settings


logger = logging.getLogger(__name__)


class CSVParser:
    """Parse CSV files with competitive pricing data"""
    
    def __init__(self):
        self.settings = get_settings()
        
        # Common column mappings for competitive data
        self.column_mappings = {
            # Product identifiers
            'product_id': ['product_id', 'sku', 'model', 'part_number', 'item_code', 'product_code'],
            'product_name': ['product_name', 'name', 'title', 'description', 'product', 'item_name'],
            'model_number': ['model_number', 'model', 'model_no', 'part_no', 'part_number'],
            
            # Pricing information
            'price': ['price', 'cost', 'amount', 'list_price', 'retail_price', 'msrp'],
            'sale_price': ['sale_price', 'promo_price', 'discounted_price', 'special_price'],
            'currency': ['currency', 'curr', 'currency_code'],
            
            # Product specifications
            'category': ['category', 'type', 'product_type', 'class', 'group'],
            'brand': ['brand', 'manufacturer', 'make', 'vendor', 'supplier'],
            'tonnage': ['tonnage', 'capacity', 'tons', 'btu', 'cooling_capacity'],
            'seer': ['seer', 'efficiency', 'seer_rating', 'energy_rating'],
            'voltage': ['voltage', 'volts', 'v', 'electrical'],
            'refrigerant': ['refrigerant', 'coolant', 'r410a', 'r22'],
            
            # Availability and timing
            'availability': ['availability', 'stock', 'in_stock', 'available', 'status'],
            'lead_time': ['lead_time', 'delivery_time', 'shipping_time', 'eta'],
            'date': ['date', 'timestamp', 'created_date', 'updated_date', 'effective_date'],
            
            # Geographic information
            'region': ['region', 'territory', 'area', 'zone', 'market'],
            'distributor': ['distributor', 'dealer', 'partner', 'reseller'],
        }
    
    async def parse(self, file_path: Path) -> Dict[str, Any]:
        """Parse CSV file and extract competitive data"""
        try:
            logger.info(f"📊 Parsing CSV file: {file_path}")
            
            # Detect encoding
            encoding = await self._detect_encoding(file_path)
            
            # Try different CSV dialects and delimiters
            df = await self._read_csv_flexible(file_path, encoding)
            
            if df is None or df.empty:
                logger.warning(f"No data found in CSV file: {file_path}")
                return None
            
            # Clean and standardize column names
            df = self._clean_dataframe(df)
            
            # Map columns to standard format
            mapped_columns = self._map_columns(df.columns.tolist())
            
            # Extract competitive data
            competitive_data = await self._extract_competitive_data(df, mapped_columns)
            
            # Add metadata
            result = {
                'format': 'csv',
                'source': str(file_path),
                'timestamp': datetime.now().isoformat(),
                'rows_processed': len(df),
                'columns_found': list(df.columns),
                'mapped_columns': mapped_columns,
                'competitive_data': competitive_data,
                'summary': self._generate_summary(competitive_data)
            }
            
            logger.info(f"✅ Successfully parsed CSV: {len(competitive_data)} products found")
            return result
        
        except Exception as e:
            logger.error(f"❌ Error parsing CSV file {file_path}: {e}")
            return None
    
    async def _detect_encoding(self, file_path: Path) -> str:
        """Detect file encoding"""
        try:
            with open(file_path, 'rb') as f:
                raw_data = f.read(10000)  # Read first 10KB
                result = chardet.detect(raw_data)
                encoding = result.get('encoding', 'utf-8')
                confidence = result.get('confidence', 0)
                
                if confidence < 0.7:
                    logger.warning(f"Low encoding confidence ({confidence:.2f}) for {file_path}, using utf-8")
                    encoding = 'utf-8'
                
                logger.debug(f"Detected encoding: {encoding} (confidence: {confidence:.2f})")
                return encoding
        except Exception as e:
            logger.warning(f"Could not detect encoding for {file_path}: {e}, using utf-8")
            return 'utf-8'
    
    async def _read_csv_flexible(self, file_path: Path, encoding: str) -> Optional[pd.DataFrame]:
        """Try reading CSV with different parameters"""
        
        # Common delimiter options
        delimiters = [',', ';', '\t', '|']
        
        for delimiter in delimiters:
            try:
                # Try with pandas first (most reliable)
                df = pd.read_csv(
                    file_path,
                    encoding=encoding,
                    delimiter=delimiter,
                    skipinitialspace=True,
                    low_memory=False,
                    na_values=['', 'N/A', 'NULL', 'null', 'None', '-'],
                    keep_default_na=True
                )
                
                # Check if we got meaningful data (more than 1 column and some rows)
                if len(df.columns) > 1 and len(df) > 0:
                    logger.debug(f"Successfully read CSV with delimiter '{delimiter}'")
                    return df
            
            except Exception as e:
                logger.debug(f"Failed to read with delimiter '{delimiter}': {e}")
                continue
        
        # If pandas fails, try with csv module and auto-detect dialect
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                # Read a sample to detect dialect
                sample = f.read(1024)
                f.seek(0)
                
                dialect = csv.Sniffer().sniff(sample)
                reader = csv.DictReader(f, dialect=dialect)
                
                rows = list(reader)
                if rows:
                    df = pd.DataFrame(rows)
                    logger.debug("Successfully read CSV using csv.Sniffer")
                    return df
        
        except Exception as e:
            logger.debug(f"Failed to read with csv.Sniffer: {e}")
        
        logger.error(f"Could not read CSV file with any method: {file_path}")
        return None
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and standardize the dataframe"""
        
        # Clean column names
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace('-', '_')
        
        # Remove completely empty rows and columns
        df = df.dropna(how='all').dropna(axis=1, how='all')
        
        # Strip whitespace from string columns
        string_columns = df.select_dtypes(include=['object']).columns
        for col in string_columns:
            df[col] = df[col].astype(str).str.strip()
        
        return df
    
    def _map_columns(self, columns: List[str]) -> Dict[str, str]:
        """Map CSV columns to standard competitive data fields"""
        mapped = {}
        
        for standard_field, possible_names in self.column_mappings.items():
            for col in columns:
                col_clean = col.lower().strip()
                if col_clean in [name.lower() for name in possible_names]:
                    mapped[standard_field] = col
                    break
        
        return mapped
    
    async def _extract_competitive_data(self, df: pd.DataFrame, mapped_columns: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract competitive data from the dataframe"""
        competitive_data = []
        
        for index, row in df.iterrows():
            try:
                product = {}
                
                # Extract mapped fields
                for standard_field, csv_column in mapped_columns.items():
                    if csv_column in df.columns:
                        value = row[csv_column]
                        if pd.notna(value) and value != '':
                            product[standard_field] = self._clean_value(value)
                
                # Add unmapped columns as additional data
                additional_data = {}
                for col in df.columns:
                    if col not in mapped_columns.values():
                        value = row[col]
                        if pd.notna(value) and value != '':
                            additional_data[col] = self._clean_value(value)
                
                if additional_data:
                    product['additional_data'] = additional_data
                
                # Add row metadata
                product['row_index'] = index
                product['data_source'] = 'csv'
                
                # Only add if we have some meaningful data
                if len(product) > 2:  # More than just row_index and data_source
                    competitive_data.append(product)
            
            except Exception as e:
                logger.warning(f"Error processing row {index}: {e}")
                continue
        
        return competitive_data
    
    def _clean_value(self, value: Any) -> Any:
        """Clean and convert values to appropriate types"""
        if pd.isna(value):
            return None
        
        if isinstance(value, str):
            value = value.strip()
            
            # Try to convert numeric strings
            if value.replace('.', '').replace('-', '').isdigit():
                try:
                    if '.' in value:
                        return float(value)
                    else:
                        return int(value)
                except ValueError:
                    pass
            
            # Clean price strings
            if any(symbol in value for symbol in ['$', '€', '£', '¥']):
                cleaned = ''.join(c for c in value if c.isdigit() or c == '.')
                try:
                    return float(cleaned)
                except ValueError:
                    pass
        
        return value
    
    def _generate_summary(self, competitive_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary statistics for the competitive data"""
        if not competitive_data:
            return {}
        
        summary = {
            'total_products': len(competitive_data),
            'fields_found': set(),
            'price_range': {},
            'brands_found': set(),
            'categories_found': set()
        }
        
        prices = []
        for product in competitive_data:
            # Collect all fields
            summary['fields_found'].update(product.keys())
            
            # Collect prices
            if 'price' in product:
                try:
                    price = float(product['price'])
                    prices.append(price)
                except (ValueError, TypeError):
                    pass
            
            # Collect brands
            if 'brand' in product:
                summary['brands_found'].add(product['brand'])
            
            # Collect categories
            if 'category' in product:
                summary['categories_found'].add(product['category'])
        
        # Price statistics
        if prices:
            summary['price_range'] = {
                'min': min(prices),
                'max': max(prices),
                'avg': sum(prices) / len(prices),
                'count': len(prices)
            }
        
        # Convert sets to lists for JSON serialization
        summary['fields_found'] = list(summary['fields_found'])
        summary['brands_found'] = list(summary['brands_found'])
        summary['categories_found'] = list(summary['categories_found'])
        
        return summary