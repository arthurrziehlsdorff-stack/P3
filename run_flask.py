#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server_python'))

from app import app, socketio

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting EcoRide Flask server on port {port}...")
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
