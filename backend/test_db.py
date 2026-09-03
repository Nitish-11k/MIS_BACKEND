import pyodbc
conn = pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER=127.0.0.1,1433;DATABASE=ManualMis;Trusted_Connection=yes;TrustServerCertificate=yes')
cursor = conn.cursor()
cursor.execute('SELECT top 1 * FROM dep_shadow_file')
print([column[0] for column in cursor.description])
