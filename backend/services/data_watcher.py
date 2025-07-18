"""
Data folder monitoring and automatic processing
"""

import asyncio
import logging
from pathlib import Path
from typing import Set, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileModifiedEvent

from backend.core.config import get_settings
from backend.services.data_processor import DataProcessor


logger = logging.getLogger(__name__)


class DataWatcherHandler(FileSystemEventHandler):
    """Handle file system events for data folder"""
    
    def __init__(self, processor: DataProcessor):
        self.processor = processor
        self.settings = get_settings()
        self.processed_files: Set[str] = set()
        
    def on_created(self, event):
        """Handle file creation"""
        if not event.is_directory:
            self._handle_file_event(event.src_path, "created")
    
    def on_modified(self, event):
        """Handle file modification"""
        if not event.is_directory:
            self._handle_file_event(event.src_path, "modified")
    
    def _handle_file_event(self, file_path: str, event_type: str):
        """Process file events"""
        file_path = Path(file_path)
        
        # Skip if already processed recently
        if str(file_path) in self.processed_files:
            return
        
        # Check if file extension is supported
        if file_path.suffix.lower() not in self.settings.supported_formats:
            logger.debug(f"Skipping unsupported file: {file_path}")
            return
        
        # Check file size
        try:
            file_size_mb = file_path.stat().st_size / (1024 * 1024)
            if file_size_mb > self.settings.max_file_size_mb:
                logger.warning(f"File too large ({file_size_mb:.1f}MB): {file_path}")
                return
        except OSError:
            logger.error(f"Could not access file: {file_path}")
            return
        
        logger.info(f"File {event_type}: {file_path}")
        
        # Add to processed set to avoid duplicates
        self.processed_files.add(str(file_path))
        
        # Schedule processing if auto-process is enabled
        if self.settings.auto_process:
            asyncio.create_task(self._process_file(file_path))
    
    async def _process_file(self, file_path: Path):
        """Process a single file asynchronously"""
        try:
            logger.info(f"🔄 Processing file: {file_path}")
            result = await self.processor.process_file(file_path)
            
            if result.success:
                logger.info(f"✅ Successfully processed {file_path}: {len(result.matches)} matches found")
            else:
                logger.error(f"❌ Failed to process {file_path}: {result.error}")
        
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
        
        finally:
            # Remove from processed set after some time to allow reprocessing
            await asyncio.sleep(300)  # 5 minutes
            self.processed_files.discard(str(file_path))


class DataWatcher:
    """Monitor data folder for new files and changes"""
    
    def __init__(self, data_path: Path):
        self.data_path = Path(data_path)
        self.observer: Optional[Observer] = None
        self.processor = DataProcessor()
        self.handler = DataWatcherHandler(self.processor)
        
    async def start(self):
        """Start watching the data folder"""
        if not self.data_path.exists():
            logger.warning(f"Data path does not exist: {self.data_path}")
            return
        
        self.observer = Observer()
        self.observer.schedule(
            self.handler,
            str(self.data_path),
            recursive=True
        )
        
        self.observer.start()
        logger.info(f"📁 Started watching: {self.data_path}")
        
        # Process existing files on startup
        await self._process_existing_files()
    
    async def stop(self):
        """Stop watching the data folder"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("📁 Stopped data watcher")
    
    async def _process_existing_files(self):
        """Process files that already exist in the data folder"""
        logger.info("🔍 Scanning for existing files...")
        
        existing_files = []
        for pattern in get_settings().supported_formats:
            existing_files.extend(self.data_path.rglob(f"*{pattern}"))
        
        if existing_files:
            logger.info(f"Found {len(existing_files)} existing files to process")
            
            # Process files in batches to avoid overwhelming the system
            batch_size = get_settings().batch_size
            for i in range(0, len(existing_files), batch_size):
                batch = existing_files[i:i + batch_size]
                tasks = [self.handler._process_file(file_path) for file_path in batch]
                await asyncio.gather(*tasks, return_exceptions=True)
                
                # Small delay between batches
                if i + batch_size < len(existing_files):
                    await asyncio.sleep(2)
        
        logger.info("✅ Finished processing existing files")