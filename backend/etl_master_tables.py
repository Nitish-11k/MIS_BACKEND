import pyodbc
from app.api import get_db_connection
import re
from datetime import datetime

def parse_date(date_str):
    if not date_str or str(date_str).strip() == '':
        return None
    date_str = str(date_str).strip().replace('-', '/')
    try:
        dt = datetime.strptime(date_str, '%d/%m/%Y')
        return dt.strftime('%Y-%m-%d')
    except ValueError:
        try:
            dt = datetime.strptime(date_str, '%Y/%m/%d')
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            return None

def parse_amount(val):
    if not val or val.strip() == '':
        return 0.0
    val = str(val).strip()
    is_negative = False
    if val.endswith('-'):
        is_negative = True
        val = val[:-1]
    if val.endswith('Cr'):
        val = val[:-2].strip()
    elif val.endswith('Dr'):
        val = val[:-2].strip()
    val = val.replace(',', '')
    try:
        num = float(val)
        return -num if is_negative else num
    except ValueError:
        return 0.0

def run_etl():
    conn = get_db_connection()
    cursor = conn.cursor()
    # ENABLE BLAZING FAST INSERTS
    cursor.fast_executemany = True
    
    print("Starting Lightning Fast ETL Process...")
    
    # Clean up existing fact tables to prevent Primary Key violations on re-runs
    print("Truncating Master Fact Tables...")
    try:
        cursor.execute("TRUNCATE TABLE fact_gl_balances_daily")
        cursor.execute("TRUNCATE TABLE fact_gl_transactions_daily")
        cursor.execute("TRUNCATE TABLE fact_loan_master_daily")
        cursor.execute("TRUNCATE TABLE fact_deposit_master_daily")
        cursor.execute("TRUNCATE TABLE fact_npa_rbi_master")
        cursor.execute("TRUNCATE TABLE fact_ews_audit_exceptions")
        conn.commit()
    except Exception as e:
        print(f"Warning during truncate: {e}")

    print("Loading fact_gl_balances_daily...")
    cursor.execute("""
        SELECT * FROM (
            SELECT GL_CLASS_CODE, LEDGER_NAME, BRANCH_CODE, CR_BALANCE, DR_BALANCE, PROC_DATE,
            ROW_NUMBER() OVER(PARTITION BY GL_CLASS_CODE, BRANCH_CODE, PROC_DATE ORDER BY PROC_DATE) as rn
            FROM BAL_IN_GL_ACC_GLCC_WISE_DET
            WHERE GL_CLASS_CODE IS NOT NULL AND GL_CLASS_CODE != ''
        ) T WHERE rn = 1
    """)
    rows = cursor.fetchall()
    gl_params = []
    for r in rows:
        cr = parse_amount(r.CR_BALANCE)
        dr = parse_amount(r.DR_BALANCE)
        net = cr - dr
        gl_params.append((
            r.GL_CLASS_CODE, r.LEDGER_NAME, r.BRANCH_CODE, cr, dr, net, parse_date(r.PROC_DATE)
        ))
    if gl_params:
        cursor.executemany("INSERT INTO fact_gl_balances_daily (gl_code, gl_name, branch_code, cr_balance, dr_balance, net_balance, snapshot_date) VALUES (?, ?, ?, ?, ?, ?, ?)", gl_params)
        conn.commit()

    print("Loading fact_gl_transactions_daily...")
    cursor.execute("""
        SELECT * FROM (
            SELECT ACCOUNT_NUMBER as GL_CODE, ACCOUNT_NAME as LEDGER_NAME, TXN_TYPE, DEBIT, CREDIT, BRANCH_CODE, PROC_DATE,
            ROW_NUMBER() OVER(PARTITION BY ACCOUNT_NUMBER, TXN_TYPE, DEBIT, CREDIT, BRANCH_CODE, PROC_DATE ORDER BY PROC_DATE) as rn
            FROM GL_DAYBOOK_GEND0807
            WHERE ACCOUNT_NUMBER IS NOT NULL AND ACCOUNT_NUMBER != ''
        ) T WHERE rn = 1
    """)
    rows = cursor.fetchall()
    txn_params = []
    for r in rows:
        dr = parse_amount(r.DEBIT)
        cr = parse_amount(r.CREDIT)
        txn_params.append((
            r.GL_CODE, r.LEDGER_NAME, r.BRANCH_CODE, r.TXN_TYPE, dr, cr, parse_date(r.PROC_DATE)
        ))
    if txn_params:
        cursor.executemany("INSERT INTO fact_gl_transactions_daily (gl_code, gl_name, branch_code, txn_type, debit_amount, credit_amount, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)", txn_params)
        conn.commit()

    print("Successfully populated all Master Fact and Dimension Tables.")
    cursor.execute("""
        INSERT INTO dim_branch_hierarchy (branch_code, branch_name)
        SELECT DISTINCT BRANCH_CODE, BRANCH_NAME FROM BRANCH_NETWORK 
        WHERE BRANCH_CODE IS NOT NULL AND BRANCH_CODE NOT IN (SELECT branch_code FROM dim_branch_hierarchy)
    """)

    # DIMENSIONS
    print("Loading Dimensions...")
    cursor.execute("""
        INSERT INTO dim_branch_hierarchy (branch_code, branch_name)
        SELECT DISTINCT BRANCH_CODE, BRANCH_NAME FROM BRANCH_NETWORK 
        WHERE BRANCH_CODE IS NOT NULL AND BRANCH_CODE NOT IN (SELECT branch_code FROM dim_branch_hierarchy)
    """)
    cursor.execute("""
        INSERT INTO dim_customer_cif (cif_number, customer_name)
        SELECT DISTINCT CUSTOMER_NO, MAX(ACCOUNT_NAME) FROM ACCOUNT_OPENED_REPORT
        WHERE CUSTOMER_NO IS NOT NULL AND CUSTOMER_NO NOT IN (SELECT cif_number FROM dim_customer_cif)
        GROUP BY CUSTOMER_NO
    """)
    cursor.execute("""
        INSERT INTO dim_loan_scheme (scheme_code, loan_type_group)
        SELECT DISTINCT ACCOUNT_TYPE, 'LOAN' FROM LOANSBALANCEFILE_LOND2390
        WHERE ACCOUNT_TYPE IS NOT NULL AND ACCOUNT_TYPE NOT IN (SELECT scheme_code FROM dim_loan_scheme)
    """)
    conn.commit()

    # FACT LOAN
    print("Loading fact_loan_master_daily (Term Loans)...")
    cursor.execute("""
        SELECT * FROM (
            SELECT L.ACCOUNT_NO, L.PROC_DATE, L.BRANCH_CODE, L.ACCOUNT_TYPE, L.LIMIT, L.OUTSTANDING, L.THEO_BAL, L.IRREGULARITY, L.INT_RATE, L.NEW_IRAC, L.CUSTOMER_NAME, A.CUSTOMER_NO, DP.DRAWING_POWER,
            ROW_NUMBER() OVER(PARTITION BY L.ACCOUNT_NO, L.PROC_DATE ORDER BY L.PROC_DATE) as rn
            FROM LOANSBALANCEFILE_LOND2390 L
            LEFT JOIN (SELECT ACCOUNT_NUMBER, MAX(CUSTOMER_NO) as CUSTOMER_NO FROM ACCOUNT_OPENED_REPORT GROUP BY ACCOUNT_NUMBER) A ON L.ACCOUNT_NO = A.ACCOUNT_NUMBER
            LEFT JOIN (SELECT ACCOUNT_NO, MAX(DRAWING_POWER) as DRAWING_POWER FROM DRAWING_POWER_LOND2388 GROUP BY ACCOUNT_NO) DP ON L.ACCOUNT_NO = DP.ACCOUNT_NO
        ) T WHERE rn = 1
    """)
    loans_data = cursor.fetchall()
    
    insert_loan_query = """
        INSERT INTO fact_loan_master_daily (account_no, snapshot_date, cif_number, customer_name, branch_code, scheme_code, sanction_limit, drawing_power, outstanding_balance, theoretical_balance, irregularity_amount, active_interest_rate, rbi_asset_classification)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    loan_params = []
    for row in loans_data:
        loan_params.append((
            row.ACCOUNT_NO, parse_date(row.PROC_DATE), row.CUSTOMER_NO, row.CUSTOMER_NAME, row.BRANCH_CODE, row.ACCOUNT_TYPE,
            parse_amount(row.LIMIT), parse_amount(row.DRAWING_POWER) if row.DRAWING_POWER else None,
            parse_amount(row.OUTSTANDING), parse_amount(row.THEO_BAL), parse_amount(row.IRREGULARITY),
            parse_amount(row.INT_RATE), row.NEW_IRAC
        ))
    if loan_params:
        cursor.executemany(insert_loan_query, loan_params)
        conn.commit()

    # CC OD
    print("Loading fact_loan_master_daily (CC/OD)...")
    cursor.execute("""
        SELECT * FROM (
            SELECT C.ACCOUNT_NUM, C.PROC_DATE, C.ACCT_MAINTAIN_BRANCH, C.ACCOUNT_TYP_DESC, C.LIMIT, C.DRAWING_POWER, C.ACCOUNT_BALANCE, C.IRREGULARITY, C.RATE, C.NEW, C.CUSTOMER_NAME, A.CUSTOMER_NO,
            ROW_NUMBER() OVER(PARTITION BY C.ACCOUNT_NUM, C.PROC_DATE ORDER BY C.PROC_DATE) as rn
            FROM CC_OD_BALANCE_FILE_DEPD0580 C
            LEFT JOIN (SELECT ACCOUNT_NUMBER, MAX(CUSTOMER_NO) as CUSTOMER_NO FROM ACCOUNT_OPENED_REPORT GROUP BY ACCOUNT_NUMBER) A ON C.ACCOUNT_NUM = A.ACCOUNT_NUMBER
        ) T WHERE rn = 1
    """)
    cc_data = cursor.fetchall()
    cc_params = []
    for row in cc_data:
        cc_params.append((
            row.ACCOUNT_NUM, parse_date(row.PROC_DATE), row.CUSTOMER_NO, row.CUSTOMER_NAME, row.ACCT_MAINTAIN_BRANCH, row.ACCOUNT_TYP_DESC,
            parse_amount(row.LIMIT), parse_amount(row.DRAWING_POWER), parse_amount(row.ACCOUNT_BALANCE),
            parse_amount(row.ACCOUNT_BALANCE), parse_amount(row.IRREGULARITY), parse_amount(row.RATE), row.NEW
        ))
    if cc_params:
        cursor.executemany(insert_loan_query, cc_params)
        conn.commit()

    # DEPOSITS
    print("Loading fact_deposit_master_daily...")
    cursor.execute("""
        SELECT * FROM (
            SELECT D.ACCOUNT_NUMBER, D.PROC_DATE, D.BRANCH_CODE, D.ACCOUNT_TYPE, D.CURRENT_BALANCE, D.AVAILABLE_BALANCE, D.UNCLEARED_BALANCE, D.INT_RATE, D.STATUS, D.CUSTOMER_NAME, A.CUSTOMER_NO,
            ROW_NUMBER() OVER(PARTITION BY D.ACCOUNT_NUMBER, D.PROC_DATE ORDER BY D.PROC_DATE) as rn
            FROM DEPOSITS_BALANCE_FILE_DEPD0586 D
            LEFT JOIN (SELECT ACCOUNT_NUMBER, MAX(CUSTOMER_NO) as CUSTOMER_NO FROM ACCOUNT_OPENED_REPORT GROUP BY ACCOUNT_NUMBER) A ON D.ACCOUNT_NUMBER = A.ACCOUNT_NUMBER
        ) T WHERE rn = 1
    """)
    deps_data = cursor.fetchall()
    insert_dep_query = """
        INSERT INTO fact_deposit_master_daily (deposit_account_no, snapshot_date, cif_number, customer_name, branch_code, deposit_type, current_balance, available_balance, uncleared_balance, interest_rate, account_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    dep_params = []
    for row in deps_data:
        dep_params.append((
            row.ACCOUNT_NUMBER, parse_date(row.PROC_DATE), row.CUSTOMER_NO, row.CUSTOMER_NAME, row.BRANCH_CODE, row.ACCOUNT_TYPE,
            parse_amount(row.CURRENT_BALANCE), parse_amount(row.AVAILABLE_BALANCE), parse_amount(row.UNCLEARED_BALANCE),
            parse_amount(row.INT_RATE), row.STATUS
        ))
    if dep_params:
        cursor.executemany(insert_dep_query, dep_params)
        conn.commit()

    # NPA
    print("Loading fact_npa_rbi_master...")
    cursor.execute("""
        SELECT * FROM (
            SELECT N.ACCT_NO, N.PROC_DATE, N.BRANCH_CODE, N.NPA_DATE, N.OUTSTANDING, N.OI, N.UIPY, N.INCA, L.NEW_IRAC,
            ROW_NUMBER() OVER(PARTITION BY N.ACCT_NO, N.PROC_DATE ORDER BY N.PROC_DATE) as rn
            FROM LIST_OF_NPA_ACCOUNTS N
            LEFT JOIN (SELECT ACCOUNT_NO, MAX(NEW_IRAC) as NEW_IRAC FROM LOANSBALANCEFILE_LOND2390 GROUP BY ACCOUNT_NO) L ON N.ACCT_NO = L.ACCOUNT_NO
        ) T WHERE rn = 1
    """)
    npa_data = cursor.fetchall()
    insert_npa_query = """
        INSERT INTO fact_npa_rbi_master (account_no, branch_code, npa_date, gross_npa_amount, overdue_interest_oi, unrealized_int_uipy, income_not_coll_inca, snapshot_date, irac_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    npa_params = []
    for row in npa_data:
        npa_params.append((
            row.ACCT_NO, row.BRANCH_CODE, parse_date(row.NPA_DATE), parse_amount(row.OUTSTANDING),
            parse_amount(row.OI), parse_amount(row.UIPY), parse_amount(row.INCA), parse_date(row.PROC_DATE), row.NEW_IRAC
        ))
    if npa_params:
        cursor.executemany(insert_npa_query, npa_params)
        conn.commit()

    # EXCEPTIONS
    print("Loading fact_ews_audit_exceptions...")
    cursor.execute("SELECT ACCOUNT_NO, BRANCH_CODE, ERROR_DESC, AMOUNT, PROC_DATE FROM EXCEPTION_REPORT_DEPD0670")
    exc_data = cursor.fetchall()
    insert_exc_query = """
        INSERT INTO fact_ews_audit_exceptions (account_no, branch_code, exception_type, exception_description, breach_amount, audit_status, log_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    exc_params = []
    for row in exc_data:
        exc_params.append((
            row.ACCOUNT_NO, row.BRANCH_CODE, 'TXN_ERROR', row.ERROR_DESC, parse_amount(row.AMOUNT), 'OPEN', parse_date(row.PROC_DATE)
        ))
    
    cursor.execute("SELECT ACCOUNT_NUMBER, BRANCH_CODE, PRODUCT_INT_RATE, EFFECTIVE_INT_RATE, PROC_DATE FROM EXCEPTION_REPORT_FOR_INTEREST_RATES_VARIATION_DEPD0650")
    exc_data2 = cursor.fetchall()
    for row in exc_data2:
        desc = f"Product Rate: {row.PRODUCT_INT_RATE}, Effective Rate: {row.EFFECTIVE_INT_RATE}"
        exc_params.append((
            row.ACCOUNT_NUMBER, row.BRANCH_CODE, 'INTEREST_DEVIATION', desc, 0, 'OPEN', parse_date(row.PROC_DATE)
        ))
        
    if exc_params:
        cursor.executemany(insert_exc_query, exc_params)
        conn.commit()

    print("ETL Process Completed Successfully in Record Time!")

if __name__ == "__main__":
    run_etl()
