import pyodbc

server = r'DESKTOP-4QG3M53\MSSQLSERVER01'
database = 'ManualMis'
conn = pyodbc.connect(f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};Trusted_Connection=yes;')
cursor = conn.cursor()

# Drop ALL tables that had bad column structures or used old template parser
# They will be recreated with correct columns on next upload
tables_to_drop = [
    'LOAN_IRREGULAR_REPORT',
    'LOANSBALANCEFILE_LOND2390',
    'NPA_STMT',
    'LIST_OF_NPA_ACCOUNTS',
    'NON_HOME_BRANCH_CIFD0363',
    'INTERESTRATECHANGELOANS_CFPD0337',
    'VOUCHER_VARIFICATION_REPORT_CFPD0331',
    'VOUCHER_VARIFICATION_REPORT_CFPD0344',
    'PROBABLE_NPA_REPORT_LOND2463',
    'REPORT_MATURING_SECURITIES_LOND2443',
    'REPORT_HIGH_VALUE_TRANSACTIONS',
    'RUPEE_DRAWING_LIST_CFPD0388',
    'SUPPLIMENTARY_CONTROL_GEND7484',
    'SUPPLIMENTARY_CONTROL_GEND7516',
    'SUPPLIMENTARY_REPORT_GEND7484',
    'TRANSFER_SUPPLEMENTARY_GEND7484',
    'TRANSFER_SUPPLEMENTARY_GEND7516',
    'DEBIT_BALANCE_IN_INCOME_ACCOUNT_GEND7041',
    'LOANS_SANCTION_LETTER_FOR_AC402000294534',
    'OVERDUE_NOTICE_LOND2384',
]

dropped = 0
for tbl in tables_to_drop:
    try:
        cursor.execute(f"DROP TABLE [{tbl}]")
        dropped += 1
        print(f"DROPPED: {tbl}")
    except Exception as e:
        print(f"Skip {tbl}: table doesn't exist")

conn.commit()
conn.close()
print(f"\nDropped {dropped} tables. Now re-upload your files!")
