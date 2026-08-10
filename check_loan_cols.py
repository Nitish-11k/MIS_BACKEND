import pyodbc
conn = pyodbc.connect(r'DRIVER={ODBC Driver 17 for SQL Server};SERVER=DESKTOP-4QG3M53\MSSQLSERVER01;DATABASE=ManualMis;Trusted_Connection=yes;')
cols = conn.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BAL_IN_LOAN_ACC_GLCC_WISE_DET'").fetchall()
print([c[0] for c in cols])
print(conn.execute("SELECT TOP 3 * FROM BAL_IN_LOAN_ACC_GLCC_WISE_DET").fetchall())
