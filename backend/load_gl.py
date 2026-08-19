import pyodbc
from app.api import get_db_connection

def parse_amount(val):
    if not val:
        return 0.0
    val = str(val).replace(',', '').strip()
    if val.endswith('Cr'):
        val = val[:-2].strip()
    elif val.endswith('Dr'):
        val = '-' + val[:-2].strip()
    try:
        return float(val)
    except:
        return 0.0

def parse_date(val):
    if not val:
        return None
    val = str(val).strip()
    # Format usually DD/MM/YYYY
    parts = val.split('/')
    if len(parts) == 3:
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return val

def load_gl_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.fast_executemany = True

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
    params = []
    for r in rows:
        cr = parse_amount(r.CR_BALANCE)
        dr = parse_amount(r.DR_BALANCE)
        net = cr - dr
        params.append((
            r.GL_CLASS_CODE, r.LEDGER_NAME, r.BRANCH_CODE, cr, dr, net, parse_date(r.PROC_DATE)
        ))
    if params:
        cursor.executemany("INSERT INTO fact_gl_balances_daily (gl_code, gl_name, branch_code, cr_balance, dr_balance, net_balance, snapshot_date) VALUES (?, ?, ?, ?, ?, ?, ?)", params)
        conn.commit()

    print(f"Inserted {len(params)} into fact_gl_balances_daily.")

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
    params = []
    for r in rows:
        dr = parse_amount(r.DEBIT)
        cr = parse_amount(r.CREDIT)
        params.append((
            r.GL_CODE, r.LEDGER_NAME, r.BRANCH_CODE, r.TXN_TYPE, dr, cr, parse_date(r.PROC_DATE)
        ))
    if params:
        cursor.executemany("INSERT INTO fact_gl_transactions_daily (gl_code, gl_name, branch_code, txn_type, debit_amount, credit_amount, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)", params)
        conn.commit()
    
    print(f"Inserted {len(params)} into fact_gl_transactions_daily.")

if __name__ == "__main__":
    load_gl_data()
