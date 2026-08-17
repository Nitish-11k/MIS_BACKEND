from app.api import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()
cursor.execute("UPDATE BRANCH_NETWORK SET REGIONAL_OFFICE = 'Rail Head Complex' WHERE REGIONAL_OFFICE = 'Head Complex'")
conn.commit()
conn.close()
print("Successfully updated Head Complex to Rail Head Complex")
