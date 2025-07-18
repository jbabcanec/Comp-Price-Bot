"""
Configuration management for CompPrice Bot
"""

import os
from pathlib import Path
from typing import Optional
from pydantic import BaseSettings, validator
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # Environment
    environment: str = "development"
    debug: bool = False
    
    # Server
    port: int = 8080
    host: str = "0.0.0.0"
    frontend_url: str = "http://localhost:3000"
    
    # Paths
    data_path: Path = Path("/app/data")
    database_path: Path = Path("/app/database")
    vectors_path: Path = Path("/app/vectors")
    config_path: Path = Path("/app/config")
    logs_path: Path = Path("/app/logs")
    
    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-large"
    
    # Data processing
    data_watch_enabled: bool = True
    auto_process: bool = True
    supported_formats: list = [".csv", ".xlsx", ".xls", ".pdf", ".docx", ".doc", ".txt", ".json"]
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Processing limits
    max_file_size_mb: int = 100
    batch_size: int = 10
    max_concurrent_jobs: int = 5
    
    # Cache settings
    redis_url: Optional[str] = "redis://redis:6379"
    cache_ttl: int = 3600  # 1 hour
    
    @validator("data_path", "database_path", "vectors_path", "config_path", "logs_path")
    def ensure_path_exists(cls, v):
        """Ensure directories exist"""
        if isinstance(v, str):
            v = Path(v)
        v.mkdir(parents=True, exist_ok=True)
        return v
    
    @validator("environment")
    def validate_environment(cls, v):
        """Validate environment"""
        if v not in ["development", "production", "testing"]:
            raise ValueError("Environment must be development, production, or testing")
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()