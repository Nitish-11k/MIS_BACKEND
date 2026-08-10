import os
import pyodbc
from dotenv import load_dotenv

load_dotenv('app/.env')

conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={os.environ['DB_HOST']};DATABASE={os.environ['DB_NAME']};UID={os.environ['DB_USER']};PWD={os.environ['DB_PASSWORD']}"
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

try:
    cursor.execute("DROP TABLE IF EXISTS DAILY_PRODUCTWISE_REPORT_LOAN_DEP_CLEARING_GNBD7376")
    print("Dropped GNBD7376")
except Exception as e:
    print(e)
    
try:
    cursor.execute("DROP TABLE IF EXISTS DRAWING_POWER_LOND2388")
    print("Dropped DRAWING_POWER_LOND2388")
except Exception as e:
    print(e)

conn.commit()
conn.close()
