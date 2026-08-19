from app.api import get_db_connection
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
print('All Tables:', [r[0] for r in cursor.fetchall()])
