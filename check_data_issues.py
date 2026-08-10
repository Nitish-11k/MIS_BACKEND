import sys
sys.stdout.reconfigure(encoding='utf-8')
from app.api import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

# Fix existing merged INT_RATE + STATUS data
# Current STATUS has values like "8.00     OPEN", "0.00     OPEN"
# Split: first part = INT_RATE, last part = STATUS

cursor.execute("SELECT COUNT(*) FROM DEPOSITS_BALANCE_FILE_DEPD0586 WHERE STATUS LIKE '% %' AND INT_RATE = ''")
count = cursor.fetchone()[0]
print(f"Rows with merged INT_RATE+STATUS: {count}")

if count > 0:
    # Update INT_RATE = first word from STATUS, STATUS = last word from STATUS
    cursor.execute("""
        UPDATE DEPOSITS_BALANCE_FILE_DEPD0586
        SET INT_RATE = LEFT(LTRIM(STATUS), CHARINDEX(' ', LTRIM(STATUS) + ' ') - 1),
            STATUS = REVERSE(LEFT(REVERSE(LTRIM(RTRIM(STATUS))), CHARINDEX(' ', REVERSE(LTRIM(RTRIM(STATUS))) + ' ') - 1))
        WHERE STATUS LIKE '% %' AND INT_RATE = ''
    """)
    print(f"Updated {cursor.rowcount} rows")
    conn.commit()

# Verify
cursor.execute("SELECT TOP 5 INT_RATE, STATUS FROM DEPOSITS_BALANCE_FILE_DEPD0586")
print("\nAfter fix:")
for r in cursor.fetchall():
    print(f"  INT_RATE='{r[0]}', STATUS='{r[1]}'")

conn.close()
print("\nDone!")
