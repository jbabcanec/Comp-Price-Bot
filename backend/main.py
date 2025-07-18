#!/usr/bin/env python3
"""
CompPrice Bot - Deployable Web Application
Main entry point for the web-based competitive intelligence platform
"""

import os
import asyncio
import uvicorn
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.core.config import get_settings
from backend.core.database import init_database
from backend.core.logger import setup_logging
from backend.services.data_watcher import DataWatcher
from backend.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    settings = get_settings()
    logger = setup_logging()
    
    logger.info("🚀 Starting CompPrice Bot Web Application")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Data path: {settings.data_path}")
    
    # Initialize database
    await init_database()
    
    # Start data watcher if enabled
    data_watcher = None
    if settings.data_watch_enabled:
        data_watcher = DataWatcher(settings.data_path)
        await data_watcher.start()
        logger.info(f"📁 Watching data folder: {settings.data_path}")
    
    yield
    
    # Cleanup
    if data_watcher:
        await data_watcher.stop()
    logger.info("👋 Shutting down CompPrice Bot")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    settings = get_settings()
    
    app = FastAPI(
        title="CompPrice Bot",
        description="HVAC Competitive Intelligence Platform",
        version="2.0.0",
        lifespan=lifespan,
        docs_url="/api/docs" if settings.environment == "development" else None,
        redoc_url="/api/redoc" if settings.environment == "development" else None,
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.environment == "development" else [settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include API routes
    app.include_router(api_router, prefix="/api")
    
    # Serve static files (React frontend)
    frontend_build_path = Path(__file__).parent.parent / "frontend" / "build"
    if frontend_build_path.exists():
        app.mount("/static", StaticFiles(directory=frontend_build_path / "static"), name="static")
        app.mount("/", StaticFiles(directory=frontend_build_path, html=True), name="frontend")
    
    return app


app = create_app()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    settings = get_settings()
    return {
        "status": "healthy",
        "version": "2.0.0",
        "environment": settings.environment,
        "data_path_exists": Path(settings.data_path).exists(),
        "api_configured": bool(settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here")
    }


if __name__ == "__main__":
    settings = get_settings()
    
    # Run with uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
        access_log=True,
    )