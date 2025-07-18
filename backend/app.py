from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from dotenv import load_dotenv
from services import HVACCompetitiveIntelligenceSystem, FileProcessor
from models import db, CompetitorMatch

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///comp_pricing.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

CORS(app)
db.init_app(app)

# Initialize AI agent system and file processor
agent_system = HVACCompetitiveIntelligenceSystem()
file_processor = FileProcessor()

@app.route('/api/health', methods=['GET'])
def health_check():
    status = 'healthy' if agent_system.is_initialized else 'degraded'
    message = None if agent_system.is_initialized else agent_system.initialization_error
    return jsonify({
        'status': status,
        'message': message,
        'api_key_configured': agent_system.is_initialized
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if not agent_system.is_initialized:
            return jsonify({
                'error': 'AI system not initialized',
                'message': agent_system.initialization_error
            }), 503
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        timestamp = request.form.get('timestamp')
        
        if not timestamp:
            timestamp = datetime.now().isoformat()
        
        # Process the file
        extracted_data = file_processor.process_file(file)
        
        if not extracted_data:
            return jsonify({'error': 'Could not process file'}), 400
        
        # Use AI agent system to find matches
        matches = agent_system.analyze_competitor_data(extracted_data)
        
        # Save to database
        for match in matches:
            db_match = CompetitorMatch(
                competitor_data=match['competitor_data'],
                our_product_id=match['our_product_id'],
                confidence_score=match['confidence'],
                timestamp=timestamp,
                source_file=file.filename
            )
            db.session.add(db_match)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'matches': matches,
            'timestamp': timestamp
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search_competitor():
    try:
        if not agent_system.is_initialized:
            return jsonify({
                'error': 'AI system not initialized',
                'message': agent_system.initialization_error
            }), 503
        
        data = request.json
        query = data.get('query')
        search_web = data.get('search_web', False)
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400
        
        # Use AI agent system to search and match
        search_data = {'text': query, 'search_type': 'manual_query'}
        results = agent_system.analyze_competitor_data(search_data, include_web_search=search_web)
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/matches', methods=['GET'])
def get_matches():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        matches = CompetitorMatch.query.order_by(
            CompetitorMatch.timestamp.desc()
        ).paginate(page=page, per_page=per_page)
        
        return jsonify({
            'matches': [m.to_dict() for m in matches.items],
            'total': matches.total,
            'page': page,
            'pages': matches.pages
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agents/status', methods=['GET'])
def agents_status():
    try:
        if not agent_system.is_initialized:
            return jsonify({
                'success': False,
                'error': agent_system.initialization_error,
                'agents': {
                    'data_extraction': 'offline',
                    'matching': 'offline',
                    'web_research': 'offline',
                    'image_analysis': 'offline',
                    'orchestrator': 'offline'
                },
                'system_status': 'not_configured'
            })
        
        # Check if all agents are properly initialized
        return jsonify({
            'success': True,
            'agents': {
                'data_extraction': 'ready',
                'matching': 'ready',
                'web_research': 'ready',
                'image_analysis': 'ready',
                'orchestrator': 'ready'
            },
            'system_status': 'operational'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/config/api-key', methods=['POST'])
def save_api_key():
    try:
        data = request.json
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({'error': 'API key is required'}), 400
        
        if not api_key.startswith('sk-'):
            return jsonify({'error': 'Invalid API key format'}), 400
        
        # Save to .env file
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        
        # Read existing .env content
        env_content = []
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                env_content = f.readlines()
        
        # Update or add API key
        api_key_found = False
        for i, line in enumerate(env_content):
            if line.startswith('OPENAI_API_KEY='):
                env_content[i] = f'OPENAI_API_KEY={api_key}\n'
                api_key_found = True
                break
        
        if not api_key_found:
            env_content.append(f'OPENAI_API_KEY={api_key}\n')
        
        # Write back to .env file
        with open(env_path, 'w') as f:
            f.writelines(env_content)
        
        # Reload environment variables
        load_dotenv(override=True)
        
        # Reinitialize the agent system with new API key
        global agent_system
        agent_system = HVACCompetitiveIntelligenceSystem()
        
        return jsonify({
            'success': True,
            'message': 'API key saved successfully',
            'api_key_configured': agent_system.is_initialized
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/config/api-key', methods=['GET'])
def get_api_key_status():
    try:
        current_key = os.getenv('OPENAI_API_KEY', '')
        has_key = current_key and current_key != 'your_openai_api_key_here'
        
        # Mask the key for security
        masked_key = ''
        if has_key:
            masked_key = f"sk-...{current_key[-4:]}" if len(current_key) > 4 else "sk-****"
        
        return jsonify({
            'has_api_key': has_key,
            'masked_key': masked_key,
            'system_initialized': agent_system.is_initialized
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def init_database():
    """Initialize database with proper error handling"""
    with app.app_context():
        try:
            # Create tables if they don't exist
            db.create_all()
            
            # Check if this is a fresh installation
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            if 'competitor_matches' in tables:
                # Check if there's existing data
                existing_matches = CompetitorMatch.query.count()
                if existing_matches > 0:
                    print(f"✅ Database loaded with {existing_matches} existing matches")
                else:
                    print("✅ Database initialized - ready for new data")
            else:
                print("✅ Database tables created successfully")
                
        except Exception as e:
            print(f"❌ Database initialization failed: {e}")
            raise

if __name__ == '__main__':
    init_database()
    app.run(debug=True, port=5001)