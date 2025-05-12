import sqlite3
import os

DATABASE_FILE = os.path.join(os.path.dirname(__file__), "app.db")

def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT
        )
    """)
    # 检查是否已有示例数据，避免重复插入
    cursor.execute("SELECT COUNT(*) FROM items")
    count = cursor.fetchone()[0]
    if count == 0:
        cursor.execute("INSERT INTO items (name, description) VALUES (?, ?)",
                       ("Sample Item 1", "This is a default item from the backend."))
        cursor.execute("INSERT INTO items (name, description) VALUES (?, ?)",
                       ("Another Item", "Loaded on initialization."))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    print(f"Initializing database at {DATABASE_FILE}...")
    init_db()
    print("Database initialized.")
    # 简单测试
    conn = get_db_connection()
    items_data = conn.execute("SELECT * FROM items").fetchall()
    conn.close()
    for item_row in items_data: # Renamed to avoid conflict
        print(dict(item_row))
