import pyodbc
from app.api import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

with open('database/master_schema.sql', 'r') as f:
    sql_script = f.read()

# Split by GO or just execute statements.
# Since pyodbc cursor.execute can't handle multiple batches sometimes, 
# it's better to split by ';' or execute the whole thing if it allows.
# Actually, pyodbc allows executing multiple statements separated by ';' or just as a block.
try:
    cursor.execute(sql_script)
    conn.commit()
    print("Schema created successfully!")
except Exception as e:
    print(f"Error executing schema: {e}")
