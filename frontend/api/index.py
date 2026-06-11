import sys
import os

# Add the backend_app directory to the path so it can be imported
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend_app'))

# Export the FastAPI app so Vercel can find it
from main import app
