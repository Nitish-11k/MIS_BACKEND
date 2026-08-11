import pyodbc
conn = pyodbc.connect(r'DRIVER={ODBC Driver 17 for SQL Server};SERVER=DESKTOP-4QG3M53\MSSQLSERVER01;DATABASE=ManualMis;Trusted_Connection=yes;')
cursor = conn.cursor()
cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='ACCOUNT_OPENED_REPORT'")
print('OPENED:', [row[0] for row in cursor.fetchall()])
cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='ACCOUNT_CLOSED_REPORT'")
print('CLOSED:', [row[0] for row in cursor.fetchall()])
conn.close()
