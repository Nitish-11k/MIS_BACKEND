import pyodbc
conn = pyodbc.connect(r'DRIVER={ODBC Driver 17 for SQL Server};SERVER=DESKTOP-4QG3M53\MSSQLSERVER01;DATABASE=ManualMis;Trusted_Connection=yes;')

tables_to_check = ['LIST_OF_NPA_ACCOUNTS', 'NPA_STMT', 'PROBABLE_NPA_REPORT_LOND2463', 'LOANSBALANCEFILE_LOND2390']

for t in tables_to_check:
    print(f"\n--- {t} ---")
    try:
        cols = conn.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{t}'").fetchall()
        print([c[0] for c in cols])
    except Exception as e:
        print(e)
