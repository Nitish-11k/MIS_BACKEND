import json
from app.api import get_db_connection

tables = [
    'BRANCH_NETWORK', 'ACCOUNT_OPENED_REPORT', 'LIST_OF_NPA_ACCOUNTS', 
    'BAL_IN_LOAN_ACC_GLCC_WISE_DET', 'LOANSBALANCEFILE_LOND2390', 
    'CC_OD_BALANCE_FILE_DEPD0580', 'DRAWING_POWER_LOND2388', 
    'LOAN_IRREGULAR_REPORT', 'LISTOF_NPA_ACCOUNTS_LOND2572', 
    'PROBABLE_NPA_REPORT_LOND2463', 'ARREARS_BREAK_UP_LOND2498', 
    'DEPOSITS_BALANCE_FILE_DEPD0586', 'ACCOUNT_CLOSED_REPORT', 
    'EXCEPTION_REPORT_DEPD0670', 'EXCEPTION_REPORT_FOR_INTEREST_RATES_VARIATION_DEPD0650'
]

conn = get_db_connection()
cursor = conn.cursor()

schema = {}
for table in tables:
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?", (table,))
    cols = [{"name": r[0], "type": r[1]} for r in cursor.fetchall()]
    schema[table] = cols

with open('raw_schema.json', 'w') as f:
    json.dump(schema, f, indent=2)

print("Schema saved to raw_schema.json")
