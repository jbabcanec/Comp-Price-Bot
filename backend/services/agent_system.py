import os
import json
from typing import Dict, Any, List
from openai import OpenAI
from agents import Agent, Runner
import chromadb
from chromadb.utils import embedding_functions
import base64
import requests
from googlesearch import search

class HVACCompetitiveIntelligenceSystem:
    """
    Multi-agent system for HVAC competitive intelligence using OpenAI Agents SDK
    """
    
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.is_initialized = False
        self.initialization_error = None
        
        # Check if API key is valid (not placeholder)
        if not self.api_key or self.api_key == 'your_openai_api_key_here':
            self.initialization_error = "OpenAI API key not configured. Please add your API key to the .env file."
            print(f"⚠️  Warning: {self.initialization_error}")
            self.client = None
            self.collection = None
            return
        
        try:
            self.client = OpenAI(api_key=self.api_key)
            
            # Initialize ChromaDB for vector search
            self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
            self.embedding_function = embedding_functions.OpenAIEmbeddingFunction(
                api_key=self.api_key,
                model_name="text-embedding-3-small"
            )
            
            # Create or get collection for our products
            self.collection = self.chroma_client.get_or_create_collection(
                name="products",
                embedding_function=self.embedding_function
            )
            
            # Load our product catalog
            self.load_product_catalog()
            
            self.is_initialized = True
            print("✅ AI Agent System initialized successfully")
            
        except Exception as e:
            self.initialization_error = f"Failed to initialize AI system: {str(e)}"
            print(f"❌ {self.initialization_error}")
            self.client = None
            self.collection = None
    
    def load_product_catalog(self):
        """Load product catalog from docs folder"""
        docs_path = "./docs"
        if not os.path.exists(docs_path):
            os.makedirs(docs_path)
            self._create_sample_catalog()
        
        # Load all product documents
        for filename in os.listdir(docs_path):
            if filename.endswith(('.json', '.txt', '.csv')):
                filepath = os.path.join(docs_path, filename)
                with open(filepath, 'r') as f:
                    content = f.read()
                    
                # Add to vector database
                self.collection.add(
                    documents=[content],
                    ids=[filename],
                    metadatas=[{"filename": filename, "type": "product_catalog"}]
                )
    
    def _create_sample_catalog(self):
        """Create a sample product catalog"""
        sample_products = {
            "products": [
                {
                    "id": "AC001",
                    "name": "CoolMax Pro 3-Ton AC",
                    "type": "air_conditioner",
                    "tonnage": 3,
                    "seer": 16,
                    "btu": 36000,
                    "features": ["Variable Speed", "Smart Thermostat Compatible", "Energy Star"],
                    "model_number": "CMP-36K-16S",
                    "price_range": "$3000-4000",
                    "warranty": "10 years"
                },
                {
                    "id": "HP001",
                    "name": "HeatPump Elite 4-Ton",
                    "type": "heat_pump",
                    "tonnage": 4,
                    "seer": 18,
                    "hspf": 10,
                    "btu": 48000,
                    "features": ["Dual Stage", "Quiet Operation", "Energy Star", "Cold Climate"],
                    "model_number": "HPE-48K-18S",
                    "price_range": "$4500-6000",
                    "warranty": "12 years"
                },
                {
                    "id": "FU001",
                    "name": "FurnaceMax 80K BTU",
                    "type": "furnace",
                    "btu": 80000,
                    "afue": 95,
                    "stages": 2,
                    "features": ["Modulating", "Variable Speed Blower", "WiFi Enabled"],
                    "model_number": "FMX-80K-95A",
                    "price_range": "$2500-3500",
                    "warranty": "15 years"
                }
            ]
        }
        
        with open('./docs/product_catalog.json', 'w') as f:
            json.dump(sample_products, f, indent=2)
    
    def create_data_extraction_agent(self):
        """Create data extraction agent for this request"""
        return Agent(
            name="Data Extraction Specialist",
            instructions="""
            You are an expert at extracting HVAC product information from various sources.
            Your job is to analyze competitor data and extract key specifications like:
            - Product type (AC, furnace, heat pump)
            - BTU ratings and tonnage
            - Efficiency ratings (SEER, AFUE, HSPF)
            - Model numbers and part numbers
            - Features and capabilities
            - Pricing information
            - Warranty details
            
            Always format your output as structured JSON with clear field names.
            """,
            model="gpt-4o"
        )
    
    def create_matching_agent(self):
        """Create product matching agent for this request"""
        return Agent(
            name="Product Matching Expert",
            instructions="""
            You are an HVAC expert specializing in competitive product matching.
            You receive structured competitor data and find the best matches from our catalog.
            
            Consider these factors for matching:
            - Product type must match exactly (AC vs AC, furnace vs furnace)
            - BTU/tonnage should be within 10% range
            - Efficiency ratings should be comparable
            - Feature sets should overlap significantly
            - Price ranges should be competitive
            
            Provide confidence scores (0-1) and detailed reasoning for each match.
            Only suggest matches with confidence > 0.7
            """,
            model="gpt-4o"
        )
    
    def create_orchestrator_agent(self):
        """Create orchestrator agent for this request"""
        return Agent(
            name="Competitive Intelligence Orchestrator",
            instructions="""
            You are the main orchestrator for competitive intelligence analysis.
            You analyze competitor data and find matching products in our catalog.
            
            Your workflow:
            1. Analyze incoming data and extract product specifications
            2. Search our product catalog for similar products
            3. Calculate match confidence scores
            4. Provide detailed recommendations
            
            Always provide clear, actionable intelligence with confidence scores.
            """,
            model="gpt-4o"
        )
    
    def extract_product_specs(self, data: str) -> Dict[str, Any]:
        """Tool: Extract product specifications from text"""
        if not self.is_initialized:
            return {"error": self.initialization_error}
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": f"""
                    Extract HVAC product specifications from this data:
                    {data}
                    
                    Return JSON with fields:
                    - product_type: AC/furnace/heat_pump
                    - model_number: string
                    - btu: number
                    - tonnage: number (if AC/heat pump)
                    - seer: number (if AC/heat pump)
                    - afue: number (if furnace)
                    - hspf: number (if heat pump)
                    - features: array of strings
                    - price: string
                    - warranty: string
                    """
                }],
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return {"error": str(e)}
    
    def search_product_catalog(self, query: str) -> List[Dict[str, Any]]:
        """Tool: Search our product catalog"""
        if not self.is_initialized:
            return [{"error": self.initialization_error}]
        
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=5
            )
            
            products = []
            for i, doc in enumerate(results['documents'][0]):
                products.append({
                    'id': results['ids'][0][i],
                    'content': doc,
                    'metadata': results['metadatas'][0][i]
                })
            
            return products
        except Exception as e:
            return [{"error": str(e)}]
    
    def calculate_match_confidence(self, competitor_specs: Dict, our_product: Dict) -> float:
        """Tool: Calculate match confidence between products"""
        try:
            # Simple confidence calculation - can be enhanced
            confidence = 0.0
            
            # Type match (must match exactly)
            if competitor_specs.get('product_type') == our_product.get('product_type'):
                confidence += 0.3
            else:
                return 0.0  # No match if types don't match
            
            # BTU/tonnage match (within 10%)
            comp_btu = competitor_specs.get('btu', 0)
            our_btu = our_product.get('btu', 0)
            if comp_btu and our_btu:
                btu_diff = abs(comp_btu - our_btu) / our_btu
                if btu_diff <= 0.1:
                    confidence += 0.3
                elif btu_diff <= 0.2:
                    confidence += 0.2
            
            # Efficiency match
            if competitor_specs.get('seer') and our_product.get('seer'):
                seer_diff = abs(competitor_specs['seer'] - our_product['seer']) / our_product['seer']
                if seer_diff <= 0.1:
                    confidence += 0.2
                elif seer_diff <= 0.2:
                    confidence += 0.1
            
            # Feature overlap
            comp_features = set(competitor_specs.get('features', []))
            our_features = set(our_product.get('features', []))
            if comp_features and our_features:
                overlap = len(comp_features & our_features) / len(our_features)
                confidence += overlap * 0.2
            
            return min(confidence, 1.0)
            
        except Exception as e:
            return 0.0
    
    def web_search(self, query: str) -> List[str]:
        """Tool: Search the web for information"""
        try:
            results = list(search(query + " HVAC specifications", num=5, stop=5))
            return results
        except Exception as e:
            return [f"Error: {str(e)}"]
    
    def analyze_webpage(self, url: str) -> Dict[str, Any]:
        """Tool: Analyze a webpage for product information"""
        if not self.is_initialized:
            return {"error": self.initialization_error}
        
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(response.text, 'html.parser')
                text = soup.get_text()[:5000]  # Limit text length
                
                # Use GPT to extract product info
                gpt_response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{
                        "role": "user",
                        "content": f"Extract HVAC product information from this webpage text: {text}"
                    }]
                )
                
                return {
                    "url": url,
                    "content": gpt_response.choices[0].message.content
                }
            else:
                return {"error": f"Failed to fetch {url}"}
        except Exception as e:
            return {"error": str(e)}
    
    def analyze_image(self, image_data: bytes) -> Dict[str, Any]:
        """Tool: Analyze product image"""
        if not self.is_initialized:
            return {"error": self.initialization_error}
        
        try:
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all HVAC product information from this image including model numbers, specifications, and features. Format as JSON."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }],
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return {"error": str(e)}
    
    def analyze_competitor_data(self, data: Dict[str, Any], include_web_search: bool = False) -> List[Dict[str, Any]]:
        """Main method to analyze competitor data using the agent system"""
        if not self.is_initialized:
            return [{"error": self.initialization_error}]
        
        try:
            # Create orchestrator agent for this request
            orchestrator = self.create_orchestrator_agent()
            
            # Get our product catalog for context
            catalog_results = self.search_product_catalog(str(data))
            catalog_context = json.dumps(catalog_results, indent=2)
            
            # Create input message
            input_message = f"""
            Analyze this competitor data and find matching products in our catalog:
            
            COMPETITOR DATA:
            {json.dumps(data, indent=2)}
            
            OUR PRODUCT CATALOG:
            {catalog_context}
            
            Please:
            1. Extract product specifications from the competitor data
            2. Find the best matches in our catalog
            3. Calculate confidence scores (0-1)
            4. Provide detailed reasoning for each match
            
            Respond with JSON format:
            {{
                "matches": [
                    {{
                        "our_product_id": "product_id",
                        "confidence": 0.85,
                        "reasoning": "detailed explanation",
                        "competitor_specs": {{"extracted": "specs"}},
                        "our_specs": {{"matching": "specs"}}
                    }}
                ]
            }}
            """
            
            # Run the orchestrator agent
            result = Runner.run_sync(orchestrator, input_message)
            
            # Parse and format the response
            return self._format_agent_response(result.final_output)
            
        except Exception as e:
            print(f"Error in agent analysis: {e}")
            return [{"error": str(e)}]
    
    def _format_agent_response(self, response) -> List[Dict[str, Any]]:
        """Format agent response into standard match format"""
        try:
            # Try to parse JSON response from agent
            if isinstance(response, str):
                # Look for JSON in the response
                import re
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                    matches = parsed.get('matches', [])
                    
                    # Format for our system
                    formatted_matches = []
                    for match in matches:
                        formatted_matches.append({
                            'competitor_data': match.get('competitor_specs', {}),
                            'our_product_id': match.get('our_product_id', 'unknown'),
                            'confidence': match.get('confidence', 0.0),
                            'matched_product': match.get('reasoning', ''),
                            'source': 'openai_agents_sdk'
                        })
                    
                    return formatted_matches
            
            # Fallback if parsing fails
            return [{
                "our_product_id": "agent_analysis_completed",
                "confidence": 0.8,
                "source": "openai_agents_sdk",
                "matched_product": str(response)[:500]  # Truncate for safety
            }]
            
        except Exception as e:
            return [{"error": f"Response parsing failed: {str(e)}"}]