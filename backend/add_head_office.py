from app.api import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

# Check if Head Office branch already exists
cursor.execute("SELECT COUNT(*) FROM BRANCH_NETWORK WHERE BRANCH_NAME = 'HEAD OFFICE'")
if cursor.fetchone()[0] == 0:
    cursor.execute("INSERT INTO BRANCH_NETWORK (HEAD_OFFICE, REGIONAL_OFFICE, BRANCH_NAME, DISTRICT) VALUES ('Head Office', 'Head Office', 'HEAD OFFICE', 'Jammu')")
    conn.commit()
    print("Inserted HEAD OFFICE branch.")
else:
    print("HEAD OFFICE branch already exists.")
conn.close()
