import sys
import os

root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, 'backend')

if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from backend.app import app as backend_app

app = backend_app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
