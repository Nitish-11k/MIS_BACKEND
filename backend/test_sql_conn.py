import pyodbc

conn_str4 = r"DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=ManualMis;Trusted_Connection=yes;TrustServerCertificate=yes;"
conn_str5 = r"DRIVER={ODBC Driver 17 for SQL Server};SERVER=DESKTOP-4QG3M53,1433;DATABASE=ManualMis;Trusted_Connection=yes;TrustServerCertificate=yes;"

for i, cs in enumerate([conn_str4, conn_str5]):
    print(f"Testing conn {i+4}...")
    try:
        conn = pyodbc.connect(cs, timeout=3)
        print(f"Success conn {i+4}!")
        conn.close()
    except Exception as e:
        print(f"Failed conn {i+4}: {e}")
