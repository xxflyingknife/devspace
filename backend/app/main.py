from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from .database import get_db_connection, init_db # Relative import

app = Flask(__name__)
CORS(app)

# 确保数据库在应用启动时初始化
with app.app_context():
    db_path = os.path.join(os.path.dirname(__file__), "app.db")
    print(f"Checking for database at: {db_path}")
    # init_db is idempotent for table creation and data insertion as designed
    init_db()
    print("Database checked/initialized.")


@app.route("/")
def home():
    return "Hello from Python Backend!"

@app.route("/api/items", methods=["GET"])
def get_items():
    conn = get_db_connection()
    items_cursor = conn.execute("SELECT id, name, description FROM items").fetchall()
    conn.close()
    items_list = [dict(row) for row in items_cursor] # Renamed to avoid conflict
    return jsonify(items_list)

@app.route("/api/items", methods=["POST"])
def add_item():
    new_item_data = request.json
    if not new_item_data or "name" not in new_item_data:
        return jsonify({"error": "Missing item name"}), 400

    name = new_item_data["name"]
    description = new_item_data.get("description", "")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO items (name, description) VALUES (?, ?)", (name, description))
    item_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"id": item_id, "name": name, "description": description}), 201

if __name__ == "__main__":
    # For Docker, host='0.0.0.0' is important
    # The CMD in Dockerfile is ["python", "main.py"], so this will run directly
    # If you were to run , it would use this.
    app.run(host="0.0.0.0", port=5000, debug=True)
