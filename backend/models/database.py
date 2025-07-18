from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class CompetitorMatch(db.Model):
    __tablename__ = 'competitor_matches'
    
    id = db.Column(db.Integer, primary_key=True)
    competitor_data = db.Column(db.Text, nullable=False)
    our_product_id = db.Column(db.String(100), nullable=False)
    confidence_score = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    source_file = db.Column(db.String(255))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'competitor_data': json.loads(self.competitor_data) if self.competitor_data else {},
            'our_product_id': self.our_product_id,
            'confidence_score': self.confidence_score,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'source_file': self.source_file,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50))  # air_conditioner, furnace, heat_pump
    specifications = db.Column(db.Text)  # JSON
    features = db.Column(db.Text)  # JSON
    model_number = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'specifications': json.loads(self.specifications) if self.specifications else {},
            'features': json.loads(self.features) if self.features else [],
            'model_number': self.model_number,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class SearchHistory(db.Model):
    __tablename__ = 'search_history'
    
    id = db.Column(db.Integer, primary_key=True)
    query = db.Column(db.Text, nullable=False)
    results = db.Column(db.Text)  # JSON
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'query': self.query,
            'results': json.loads(self.results) if self.results else [],
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }