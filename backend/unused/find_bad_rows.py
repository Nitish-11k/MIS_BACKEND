import pyodbc
conn = pyodbc.connect(r'DRIVER={ODBC Driver 17 for SQL Server};SERVER=DESKTOP-4QG3M53\MSSQLSERVER01;DATABASE=ManualMis;Trusted_Connection=yes;')
cursor = conn.cursor()
cursor.execute("SELECT TOP 5 ACCOUNT_NO, AMOUNT, ERROR_DESC, OUTSTANDING, LIMIT_AMOUNT, CUSTOMER_NAME FROM EXCEPTION_REPORT_DEPD0670 WHERE ACCOUNT_NO LIKE '%1,%'")
for row in cursor.fetchall():
    print(row)
conn.close()
