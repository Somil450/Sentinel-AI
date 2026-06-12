import sys
import os

# Add the backend directory to the path so it can be imported
# Vercel serverless functions run from the project root
_here = os.path.dirname(__file__)
_backend = os.path.join(_here, '..', '..', 'backend')
_backend_abs = os.path.abspath(_backend)
if _backend_abs not in sys.path:
    sys.path.insert(0, _backend_abs)

# Also try relative paths used in different deployment contexts
for candidate in [
    os.path.join(_here, 'backend'),
    os.path.join(_here, '..', 'backend'),
    '/var/task/backend',
]:
    cand_abs = os.path.abspath(candidate)
    if os.path.exists(cand_abs) and cand_abs not in sys.path:
        sys.path.insert(0, cand_abs)

# Export the FastAPI app so Vercel can find it
from main import app  # type: ignore  # noqa: E402
