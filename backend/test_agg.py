import sys
sys.path.append('c:/Users/dell/Desktop/bank_mis_parser_backend/backend')
from app.db import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()
table_name = 'NPA_STMT'
cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?", (table_name,))
col_info = cursor.fetchall()

numeric_cols = [row[0] for row in col_info if row[1] in ('numeric', 'decimal', 'float', 'int', 'bigint', 'money')]
print('Numeric cols:', numeric_cols)

if numeric_cols:
    sum_selects = ', '.join([f'SUM(CAST([{c}] AS FLOAT)) as [{c}]' for c in numeric_cols])
    query = f"SELECT BRANCH_CODE, {sum_selects} FROM {table_name} GROUP BY BRANCH_CODE"
    print(query)
    try:
        cursor.execute(query)
        rows = cursor.fetchmany(3)
        print('Sample data:', rows)
    except Exception as e:
        print('Query error:', e)
