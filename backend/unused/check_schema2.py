import pyodbc
conn = pyodbc.connect(r'DRIVER={ODBC Driver 17 for SQL Server};SERVER=DESKTOP-4QG3M53\MSSQLSERVER01;DATABASE=ManualMis;Trusted_Connection=yes;')
cursor = conn.cursor()
cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CC_OD_BALANCE_FILE_DEPD0580'")
print('COLUMNS:', [row[0] for row in cursor.fetchall()])
conn.close()
