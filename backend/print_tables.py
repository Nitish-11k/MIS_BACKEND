from app.api import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'")
tables = [row[0] for row in cursor.fetchall()]
for t in tables:
    print(t)
conn.close()
