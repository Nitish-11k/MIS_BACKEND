from app.api import get_db_connection
conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%AUDIT%'")
print('Tables:', [r[0] for r in cursor.fetchall()])
cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'NPA_STMT'")
print('NPA Columns:', [r[0] for r in cursor.fetchall()])
