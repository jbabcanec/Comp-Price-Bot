.PHONY: help install install-backend install-frontend test test-backend test-frontend lint start stop clean

help:
	@echo "Available commands:"
	@echo "  make install         - Install all dependencies"
	@echo "  make install-backend - Install backend dependencies"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo "  make test           - Run all tests"
	@echo "  make test-backend   - Run backend tests"
	@echo "  make test-frontend  - Run frontend tests"
	@echo "  make lint           - Run linters"
	@echo "  make start          - Start the application"
	@echo "  make stop           - Stop the application"
	@echo "  make clean          - Clean up generated files"

install: install-backend install-frontend

install-backend:
	cd backend && pip install -r ../requirements.txt
	cd backend && pip install pytest pytest-cov pytest-mock

install-frontend:
	cd frontend && npm install

test: test-backend test-frontend

test-backend:
	cd backend && python -m pytest

test-frontend:
	cd frontend && npm test -- --watchAll=false

lint:
	cd backend && python -m flake8 . --exclude=venv,__pycache__
	cd frontend && npm run lint

start:
	./start.sh

stop:
	pkill -f "python app.py" || true
	pkill -f "npm start" || true

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf backend/htmlcov
	rm -rf frontend/coverage
	rm -rf backend/.pytest_cache
	rm -f backend/*.log