import sys
sys.path.append('.')
from app.db import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
tables = [row[0] for row in cursor.fetchall()]
print('Total Tables:', len(tables))
print('Sample Tables:', tables[:30])
