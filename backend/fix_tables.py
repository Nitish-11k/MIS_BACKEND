import pyodbc

server = r'DESKTOP-4QG3M53\MSSQLSERVER01'
database = 'ManualMis'
conn = pyodbc.connect(f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};Trusted_Connection=yes;')
cursor = conn.cursor()
conn.autocommit = True
cursor = conn.cursor()

cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
tables_to_drop = [row[0] for row in cursor.fetchall()]

dropped = 0
for tbl in tables_to_drop:
    try:
        cursor.execute(f"DROP TABLE [{tbl}]")
        dropped += 1
        print(f"DROPPED: {tbl}")
    except Exception as e:
        print(f"Skip {tbl}: {e}")

conn.close()
print(f"\nDropped {dropped} tables. Now re-upload your files!")
