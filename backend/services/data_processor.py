"""
Robust data processor for competitive intelligence files
Handles CSV, Excel, PDF, Word docs, and other formats
"""

import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from datetime import datetime
import pandas as pd
import json

from backend.services.parsers.csv_parser import CSVParser
from backend.services.parsers.excel_parser import ExcelParser
from backend.services.parsers.pdf_parser import PDFParser
from backend.services.parsers.document_parser import DocumentParser
from backend.services.parsers.image_parser import ImageParser
from backend.services.ai_analyzer import AIAnalyzer
from backend.core.config import get_settings


logger = logging.getLogger(__name__)


@dataclass
class ProcessingResult:
    """Result of processing a file"""
    success: bool
    file_path: Path
    matches: List[Dict[str, Any]]
    extracted_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class DataProcessor:
    """Main data processor for competitive intelligence files"""
    
    def __init__(self):
        self.settings = get_settings()
        self.ai_analyzer = AIAnalyzer()
        
        # Initialize parsers
        self.parsers = {
            '.csv': CSVParser(),
            '.xlsx': ExcelParser(),
            '.xls': ExcelParser(),
            '.pdf': PDFParser(),
            '.docx': DocumentParser(),
            '.doc': DocumentParser(),
            '.txt': DocumentParser(),
            '.json': self._parse_json,
            '.jpg': ImageParser(),
            '.jpeg': ImageParser(),
            '.png': ImageParser(),
            '.tiff': ImageParser(),
        }
    
    async def process_file(self, file_path: Path) -> ProcessingResult:
        """Process a single file and extract competitive data"""
        start_time = datetime.now()
        
        try:
            logger.info(f"📄 Processing file: {file_path}")
            
            # Validate file
            if not file_path.exists():
                return ProcessingResult(
                    success=False,
                    file_path=file_path,
                    matches=[],
                    error="File does not exist"
                )
            
            # Get file extension
            file_ext = file_path.suffix.lower()
            if file_ext not in self.parsers:
                return ProcessingResult(
                    success=False,
                    file_path=file_path,
                    matches=[],
                    error=f"Unsupported file format: {file_ext}"
                )
            
            # Parse the file
            parser = self.parsers[file_ext]
            if callable(parser):
                extracted_data = await parser(file_path)
            else:
                extracted_data = await parser.parse(file_path)
            
            if not extracted_data:
                return ProcessingResult(
                    success=False,
                    file_path=file_path,
                    matches=[],
                    error="Could not extract data from file"
                )
            
            logger.info(f"✅ Extracted data from {file_path}")
            
            # Analyze with AI to find competitive matches
            matches = await self.ai_analyzer.find_matches(extracted_data, file_path)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"🎯 Found {len(matches)} matches in {processing_time:.2f}s")
            
            return ProcessingResult(
                success=True,
                file_path=file_path,
                matches=matches,
                extracted_data=extracted_data,
                processing_time=processing_time
            )
        
        except Exception as e:
            logger.error(f"❌ Error processing {file_path}: {e}", exc_info=True)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ProcessingResult(
                success=False,
                file_path=file_path,
                matches=[],
                error=str(e),
                processing_time=processing_time
            )
    
    async def process_batch(self, file_paths: List[Path]) -> List[ProcessingResult]:
        """Process multiple files concurrently"""
        logger.info(f"🔄 Processing batch of {len(file_paths)} files")
        
        # Limit concurrent processing
        semaphore = asyncio.Semaphore(self.settings.max_concurrent_jobs)
        
        async def process_with_semaphore(file_path):
            async with semaphore:
                return await self.process_file(file_path)
        
        # Process all files concurrently
        tasks = [process_with_semaphore(file_path) for file_path in file_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append(ProcessingResult(
                    success=False,
                    file_path=file_paths[i],
                    matches=[],
                    error=str(result)
                ))
            else:
                processed_results.append(result)
        
        successful = sum(1 for r in processed_results if r.success)
        logger.info(f"✅ Batch complete: {successful}/{len(file_paths)} files processed successfully")
        
        return processed_results
    
    async def _parse_json(self, file_path: Path) -> Dict[str, Any]:
        """Parse JSON files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return {
                'format': 'json',
                'source': str(file_path),
                'data': data,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error parsing JSON file {file_path}: {e}")
            return None
    
    def get_supported_formats(self) -> List[str]:
        """Get list of supported file formats"""
        return list(self.parsers.keys())
    
    async def validate_file(self, file_path: Path) -> Dict[str, Any]:
        """Validate a file without processing it"""
        validation = {
            'valid': False,
            'file_path': str(file_path),
            'exists': file_path.exists(),
            'supported_format': False,
            'size_mb': 0,
            'size_valid': False,
            'errors': []
        }
        
        if not validation['exists']:
            validation['errors'].append("File does not exist")
            return validation
        
        try:
            # Check file size
            file_size_bytes = file_path.stat().st_size
            validation['size_mb'] = file_size_bytes / (1024 * 1024)
            validation['size_valid'] = validation['size_mb'] <= self.settings.max_file_size_mb
            
            if not validation['size_valid']:
                validation['errors'].append(f"File too large: {validation['size_mb']:.1f}MB (max: {self.settings.max_file_size_mb}MB)")
            
            # Check format
            file_ext = file_path.suffix.lower()
            validation['supported_format'] = file_ext in self.parsers
            
            if not validation['supported_format']:
                validation['errors'].append(f"Unsupported format: {file_ext}")
            
            validation['valid'] = validation['size_valid'] and validation['supported_format']
            
        except Exception as e:
            validation['errors'].append(f"Error validating file: {e}")
        
        return validation