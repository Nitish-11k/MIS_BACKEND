import os
import pyodbc
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from functools import lru_cache
import shutil

load_dotenv('.env')

app = FastAPI(title="Banking MIS API")

# Configure CORS so the React app can access this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    # We will use Windows Authentication as per the user's .env configuration
    server = r"DESKTOP-4QG3M53\MSSQLSERVER01"
    database = "ManualMis"
    conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};Trusted_Connection=yes;'
    return pyodbc.connect(conn_str)

def get_date_filter_sql(period: str, table_name: str, prefix: str = "WHERE", date_col: str = "PROC_DATE"):
    """Generates SQL condition for filtering by period based on the max date in the table, or by exact date."""
    if period == "ALL" or not period:
        return "", []
        
    import re
    if re.match(r"^\d{4}-\d{2}-\d{2}$", period):
        # Exact date provided (YYYY-MM-DD)
        # Convert PROC_DATE (dd/mm/yyyy) to match exact date
        sql = f" {prefix} CONVERT(date, {table_name}.{date_col}, 103) = CONVERT(date, ?, 120) "
        return sql, [period]
        
    days = 0
    if period == "7D": days = 7
    elif period == "30D": days = 30
    elif period == "6M": days = 180
    else: return "", []
    
    # Converts DD/MM/YYYY (103) to Date for comparison against the max date available in the mock DB
    sql = f" {prefix} CONVERT(date, {table_name}.{date_col}, 103) >= DATEADD(day, -?, (SELECT MAX(CONVERT(date, {date_col}, 103)) FROM {table_name})) "
    return sql, [days]

# ==========================================
# 0. Branches List
# ==========================================
@app.get("/api/branches")
def get_branches():
    conn = get_db_connection()
    cursor = conn.cursor()
    # Distinct branches from a heavily populated table (e.g. LOANSBALANCEFILE_LOND2390)
    cursor.execute("""
        SELECT DISTINCT BRANCH_CODE, BRANCH_NAME 
        FROM LOANSBALANCEFILE_LOND2390
        WHERE BRANCH_CODE IS NOT NULL AND BRANCH_CODE != ''
        ORDER BY BRANCH_CODE
    """)
    rows = cursor.fetchall()
    conn.close()
    
    branches = []
    for row in rows:
        branches.append({"code": row[0].strip(), "name": row[1].strip() if row[1] else "Unknown"})
    return branches

# ==========================================
# 0.5 Branch Comparison (NEW)
# ==========================================
@app.get("/api/branch-comparison")
def get_branch_comparison(branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Apply date filter
    where_sql, params = get_date_filter_sql(period, "DEPOSITS_BALANCE_FILE_DEPD0586")
    
    if branch_code != "ALL":
        where_sql += " AND BRANCH_CODE = ?" if "WHERE" in where_sql else " WHERE BRANCH_CODE = ?"
        params.append(branch_code)
        
    try:
        cursor.execute(f"""
            SELECT TOP 10 BRANCH_NAME, SUM(TRY_CAST(CURRENT_BALANCE AS FLOAT)) as total_deposit 
            FROM DEPOSITS_BALANCE_FILE_DEPD0586
            {where_sql}
            GROUP BY BRANCH_NAME
            ORDER BY total_deposit DESC
        """, params)
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "deposits": abs(r[1] or 0)} for r in rows]
    except Exception as e:
        print(f"Error: {e}")
        data = []
    conn.close()
    return data

@app.get("/api/opened-branch-wise")
@lru_cache(maxsize=128)
def get_opened_branch_wise(branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_sql, params = get_date_filter_sql(period, "ACCOUNT_OPENED_REPORT")
    if branch_code != "ALL":
        where_sql += " AND BRANCH_CODE = ?" if "WHERE" in where_sql else " WHERE BRANCH_CODE = ?"
        params.append(branch_code)
        
    try:
        cursor.execute(f"""
            SELECT BRANCH_NAME, COUNT(*) as cnt
            FROM ACCOUNT_OPENED_REPORT
            {where_sql}
            GROUP BY BRANCH_NAME
            ORDER BY cnt DESC
        """, params)
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "value": r[1]} for r in rows]
    except Exception as e:
        print(f"Error calculating branch-wise opened: {e}")
        data = []
    conn.close()
    return data

@app.get("/api/closed-branch-wise")
@lru_cache(maxsize=128)
def get_closed_branch_wise(branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_sql, params = get_date_filter_sql(period, "ACCOUNT_CLOSED_REPORT")
    if branch_code != "ALL":
        where_sql += " AND BRANCH_CODE = ?" if "WHERE" in where_sql else " WHERE BRANCH_CODE = ?"
        params.append(branch_code)
        
    try:
        cursor.execute(f"""
            SELECT BRANCH_NAME, COUNT(*) as cnt
            FROM ACCOUNT_CLOSED_REPORT
            {where_sql}
            GROUP BY BRANCH_NAME
            ORDER BY cnt DESC
        """, params)
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "value": r[1]} for r in rows]
    except Exception as e:
        print(f"Error calculating branch-wise closed: {e}")
        data = []
    conn.close()
    return data

@app.get("/api/deposit-branch-wise")
@lru_cache(maxsize=128)
def get_deposit_branch_wise(branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_dep, params_dep = get_date_filter_sql(period, "DEPOSITS_BALANCE_FILE_DEPD0586")
    
    if branch_code != "ALL":
        where_dep += " AND BRANCH_CODE = ?" if "WHERE" in where_dep else " WHERE BRANCH_CODE = ?"
        params_dep.append(branch_code)
        
    try:
        cursor.execute(f"""
            SELECT BRANCH_NAME, SUM(TRY_CAST(CURRENT_BALANCE AS FLOAT)) as deposits
            FROM DEPOSITS_BALANCE_FILE_DEPD0586
            {where_dep}
            GROUP BY BRANCH_NAME
            ORDER BY deposits DESC
        """, params_dep)
        
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "value": abs(r[1] or 0)} for r in rows]
    except Exception as e:
        print(f"Error calculating branch-wise deposits: {e}")
        data = []
        
    conn.close()
    return data

@app.get("/api/kpi-summary")
@lru_cache(maxsize=128)
def get_kpi_summary(branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    data = {
        "total_deposits": 0,
        "total_loans": 0,
        "total_npa": 0,
        "branches_reporting": 0
    }
    
    try:
        # Total Deposits
        where_dep, params_dep = get_date_filter_sql(period, "DEPOSITS_BALANCE_FILE_DEPD0586")
        if branch_code != "ALL":
            where_dep += " AND BRANCH_CODE = ?" if "WHERE" in where_dep else " WHERE BRANCH_CODE = ?"
            params_dep.append(branch_code)
        cursor.execute(f"SELECT SUM(TRY_CAST(CURRENT_BALANCE AS FLOAT)) FROM DEPOSITS_BALANCE_FILE_DEPD0586 {where_dep}", params_dep)
        res = cursor.fetchone()
        if res and res[0]: data["total_deposits"] = abs(res[0])
        
        # Total Loans
        where_loan, params_loan = get_date_filter_sql(period, "BAL_IN_LOAN_ACC_GLCC_WISE_DET")
        if branch_code != "ALL":
            where_loan += " AND BRANCH_CODE = ?" if "WHERE" in where_loan else " WHERE BRANCH_CODE = ?"
            params_loan.append(branch_code)
        cursor.execute(f"SELECT SUM(TRY_CAST(DR_BALANCE AS FLOAT)) FROM BAL_IN_LOAN_ACC_GLCC_WISE_DET {where_loan}", params_loan)
        res = cursor.fetchone()
        if res and res[0]: data["total_loans"] = abs(res[0])
        
        # Total NPA
        where_npa, params_npa = get_date_filter_sql(period, "NPA_STMT", "WHERE")
        if branch_code != "ALL":
            where_npa += " AND BRANCH_CODE = ?" if "WHERE" in where_npa else " WHERE BRANCH_CODE = ?"
            params_npa.append(branch_code)
        cursor.execute(f"SELECT SUM(TRY_CAST(BAL_OUTSTAND AS FLOAT)) FROM NPA_STMT {where_npa}", params_npa)
        res = cursor.fetchone()
        if res and res[0]: data["total_npa"] = abs(res[0])
        
        # Branches Reporting
        if branch_code == "ALL":
            where_br, params_br = get_date_filter_sql(period, "DEPOSITS_BALANCE_FILE_DEPD0586")
            cursor.execute(f"SELECT COUNT(DISTINCT BRANCH_CODE) FROM DEPOSITS_BALANCE_FILE_DEPD0586 {where_br}", params_br)
            res = cursor.fetchone()
            if res and res[0]: data["branches_reporting"] = res[0]
        else:
            data["branches_reporting"] = 1
            
    except Exception as e:
        print(f"Error calculating KPIs: {e}")
        
    conn.close()
    return data

# ==========================================
# 1. KPI Cards
# ==========================================
@app.get("/api/kpi")
def get_kpis(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = ""
    params = []
    if branch_code != "ALL":
        where_clause = "WHERE BRANCH_CODE = ?"
        params = [branch_code]
    
    # Total Accounts Opened
    cursor.execute(f"SELECT COUNT(*) FROM ACCOUNT_OPENED_REPORT {where_clause}", params)
    total_opened = cursor.fetchone()[0] or 0
    
    # Total GL Balance Breakdown
    cursor.execute(f"SELECT SUM(CAST(ISNULL(NULLIF(CR_BALANCE, ''), '0') AS FLOAT)), SUM(CAST(ISNULL(NULLIF(DR_BALANCE, ''), '0') AS FLOAT)) FROM BAL_IN_GL_ACC_GLCC_WISE_DET {where_clause}", params)
    gl_row = cursor.fetchone()
    total_cr_balance = float(gl_row[0]) if gl_row and gl_row[0] else 0.0
    total_dr_balance = float(gl_row[1]) if gl_row and gl_row[1] else 0.0
    total_gl_balance = total_cr_balance - total_dr_balance
    
    # Accounts Closed
    cursor.execute(f"SELECT COUNT(*) FROM ACCOUNT_CLOSED_REPORT {where_clause}", params)
    total_closed = cursor.fetchone()[0] or 0
    
    # Active Loans
    cursor.execute(f"SELECT COUNT(*) FROM BAL_IN_LOAN_ACC_GLCC_WISE_DET {where_clause}", params)
    total_loans = cursor.fetchone()[0] or 0

    # Total Deposits (from DEPD0586)
    cursor.execute(f"SELECT COUNT(*) FROM DEPOSITS_BALANCE_FILE_DEPD0586 {where_clause}", params)
    total_deposits = cursor.fetchone()[0] or 0

    # Total Members
    cursor.execute(f"SELECT COUNT(*) FROM CUSTOMER_MEMBER_REPORT {where_clause}", params)
    total_members = cursor.fetchone()[0] or 0
    
    conn.close()
    
    return {
        "total_opened": total_opened,
        "total_closed": total_closed,
        "total_gl_balance": total_gl_balance,
        "total_cr_balance": total_cr_balance,
        "total_dr_balance": total_dr_balance,
        "total_loans": total_loans,
        "total_deposits": total_deposits,
        "total_members": total_members
    }

# ==========================================
# 2. GL Distribution Pie Chart (BAL_IN_GL_ACC_GLCC_WISE_DET)
# ==========================================
@app.get("/api/gl-summary")
def get_gl_summary(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = "WHERE LEDGER_NAME IS NOT NULL AND LEDGER_NAME != ''"
    params = []
    if branch_code != "ALL":
        where_clause += " AND BRANCH_CODE = ?"
        params.append(branch_code)
        
    cursor.execute(f"""
        SELECT TOP 6 LEDGER_NAME, BRANCH_NAME, SUM(CAST(ISNULL(NULLIF(CR_BALANCE, ''), '0') AS FLOAT) + CAST(ISNULL(NULLIF(DR_BALANCE, ''), '0') AS FLOAT)) as TotalVolume
        FROM BAL_IN_GL_ACC_GLCC_WISE_DET
        {where_clause}
        GROUP BY LEDGER_NAME, BRANCH_NAME
        ORDER BY TotalVolume DESC
    """, params)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    colors = ['#FF6B6B', '#FF8E8E', '#FFAFAF', '#FFD1D1', '#FFE6E6', '#FFF0F0']
    for idx, row in enumerate(rows):
        branch = row[1] or ""
        name = f"{row[0]}" + (f" ({branch})" if branch else "")
        data.append({
            "name": name,
            "value": float(row[2]) if row[2] else 0,
            "color": colors[idx % len(colors)]
        })
    
    if not data:
        return [{"name": "No Data", "value": 1, "color": "#E2E8F0"}]
    return data

# ==========================================
# 3. Deposits by Account Type - Horizontal Bar Chart (DEPD0586)
# ==========================================
@app.get("/api/deposits-by-type")
def get_deposits_by_type(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = "WHERE ACCOUNT_TYPE IS NOT NULL AND ACCOUNT_TYPE != ''"
    params = []
    if branch_code != "ALL":
        where_clause += " AND BRANCH_CODE = ?"
        params.append(branch_code)
        
    cursor.execute(f"""
        SELECT TOP 8 ACCOUNT_TYPE, COUNT(*) as cnt
        FROM DEPOSITS_BALANCE_FILE_DEPD0586
        {where_clause}
        GROUP BY ACCOUNT_TYPE
        ORDER BY cnt DESC
    """, params)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "name": row[0],
            "value": row[1]
        })
    return data

# ==========================================
# 4. Product-wise Credit vs Debit - Grouped Bar Chart (GNBD7376)
# ==========================================
@app.get("/api/productwise-summary")
def get_productwise_summary(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = "WHERE PROD_DESC IS NOT NULL AND PROD_DESC != ''"
    params = []
    if branch_code != "ALL":
        where_clause += " AND BRANCH_CODE = ?"
        params.append(branch_code)
        
    cursor.execute(f"""
        SELECT TOP 6 PROD_DESC,
            SUM(CASE WHEN ISNUMERIC(TRANSFER_CREDIT)=1 THEN CAST(REPLACE(TRANSFER_CREDIT, ',', '') AS FLOAT) ELSE 0 END) as total_credit,
            SUM(CASE WHEN ISNUMERIC(TRANSFER_DEBIT)=1 THEN CAST(REPLACE(TRANSFER_DEBIT, ',', '') AS FLOAT) ELSE 0 END) as total_debit
        FROM DAILY_PRODUCTWISE_REPORT_LOAN_DEP_CLEARING_GNBD7376
        {where_clause}
        GROUP BY PROD_DESC
        ORDER BY total_credit DESC
    """, params)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "name": row[0][:20] if row[0] else "Unknown",
            "credit": float(row[1]) if row[1] else 0,
            "debit": float(row[2]) if row[2] else 0
        })
    return data

# ==========================================
# 5. GLCC Wise Summary - Bar Chart (GLCC_WISE_SUM_REP)
# ==========================================
@app.get("/api/glcc-summary")
def get_glcc_summary(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = "WHERE NAME IS NOT NULL AND NAME != '' AND TOTAL_AMOUNT IS NOT NULL AND TOTAL_AMOUNT != ''"
    params = []
    if branch_code != "ALL":
        where_clause += " AND BRANCH_CODE = ?"
        params.append(branch_code)
        
    cursor.execute(f"""
        SELECT TOP 8 NAME, ACT_TOTAL,
            CAST(REPLACE(REPLACE(TOTAL_AMOUNT, ',', ''), '-', '') AS FLOAT) as amount
        FROM GLCC_WISE_SUM_REP
        {where_clause}
        ORDER BY amount DESC
    """, params)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "name": row[0][:25] if row[0] else "Unknown",
            "accounts": int(row[1]) if row[1] and str(row[1]).isdigit() else 0,
            "amount": float(row[2]) if row[2] else 0
        })
    return data

# ==========================================
# 6. GL Daybook Transactions - Bar Chart by TXN_TYPE (GL_DAYBOOK_GEND0807)
# ==========================================
@app.get("/api/gl-daybook-summary")
def get_gl_daybook_summary(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = "WHERE TXN_TYPE IS NOT NULL AND TXN_TYPE != ''"
    params = []
    if branch_code != "ALL":
        where_clause += " AND BRANCH_CODE = ?"
        params.append(branch_code)
        
    cursor.execute(f"""
        SELECT TOP 6 TXN_TYPE, COUNT(*) as cnt,
            SUM(CASE WHEN ISNUMERIC(REPLACE(DEBIT, ',', ''))=1 THEN CAST(REPLACE(DEBIT, ',', '') AS FLOAT) ELSE 0 END) as total_debit
        FROM GL_DAYBOOK_GEND0807
        {where_clause}
        GROUP BY TXN_TYPE
        ORDER BY cnt DESC
    """, params)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "name": row[0][:22] if row[0] else "Unknown",
            "count": row[1],
            "amount": float(row[2]) if row[2] else 0
        })
    return data

# ==========================================
# 7. Exception Reports Table (DEPD0670)
# ==========================================
@app.get("/api/exceptions")
def get_exceptions():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT TOP 10 ACCOUNT_NO, AMOUNT, CUSTOMER_NAME, ERROR_DESC, OUTSTANDING
        FROM EXCEPTION_REPORT_DEPD0670
    """)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "account_no": row[0],
            "amount": row[1],
            "customer_name": row[2] or "-",
            "error_desc": row[3] or "-",
            "outstanding": row[4]
        })
    return data

# ==========================================
# 8. Drawing Power Table (LOND2388)
# ==========================================
@app.get("/api/drawing-power")
def get_drawing_power():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT TOP 10 CUSTOMER_NAME, ACCOUNT_NO, OUTSTANDING, DRAWING_POWER, IRREGULARITY
        FROM DRAWING_POWER_LOND2388
    """)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "customer_name": row[0],
            "account_no": row[1],
            "outstanding": row[2],
            "drawing_power": row[3],
            "irregularity": row[4]
        })
    return data

# ==========================================
# 1.5 File Summary (NEW)
# ==========================================
@app.get("/api/file-summary")
def get_file_summary(branch_code: str = 'ALL'):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all table names in DB
    cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
    tables = [row[0] for row in cursor.fetchall()]
    
    file_stats = []
    
    for table in tables:
        try:
            # We just do a quick count of records for the branch
            query = f"SELECT COUNT(*) FROM {table}"
            params = []
            
            if branch_code != 'ALL':
                # Determine branch column
                branch_col = None
                cursor.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{table}'")
                cols = [c[0].upper() for c in cursor.fetchall()]
                
                if 'BRANCH_CODE' in cols:
                    branch_col = 'BRANCH_CODE'
                elif 'BRANCH' in cols:
                    branch_col = 'BRANCH'
                elif 'BRANCH_NAME' in cols:
                    # In DB some branch_codes are numeric strings like '00010' but BRANCH_NAME holds strings like 'BASHOLI'
                    # We'll just skip branch_name filter here for simplicity unless we can map it
                    pass
                    
                if branch_col:
                    query += f" WHERE {branch_col} = ?"
                    params.append(branch_code)
                    
            cursor.execute(query, params)
            count = cursor.fetchone()[0]
            
            if count > 0:
                # We'll mock "Total Amount" and "Status" for the sake of the dashboard demo
                # since aggregating all different schemas dynamically is too slow
                file_stats.append({
                    "fileName": table,
                    "date": "2025-04-25",
                    "records": count,
                    "amount": count * 1500, # Mocked amount for visualization
                    "status": "Processed",
                    "type": "MIS Report"
                })
        except Exception as e:
            continue
            
    conn.close()
    return file_stats

# ==========================================
# 9. Account Alterations Table
# ==========================================
@app.get("/api/alterations")
def get_recent_alterations():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT TOP 10 ACCOUNT_NO, CUSTOMER_NAME, INT_RATE_OLD, INT_RATE_NEW, PROC_DATE, BRANCH_NAME, ACCT_TYPE_OLD, ACCT_TYPE_NEW 
        FROM ACCOUNT_ALTERATION_DETAILS_REPORT 
        ORDER BY PROC_DATE DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for idx, row in enumerate(rows):
        data.append({
            "id": idx + 1,
            "account_no": row[0],
            "customer_name": row[1],
            "old_rate": row[2],
            "new_rate": row[3],
            "date": str(row[4]) if row[4] else "N/A",
            "branch_name": row[5] or "N/A",
            "old_type": row[6] or "N/A",
            "new_type": row[7] or "N/A"
        })
    return data

# ==========================================
# 10. Deposit Balances Table (DEPD0586)
# ==========================================
@app.get("/api/deposit-balances")
def get_deposit_balances():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT TOP 10 ACCOUNT_NUMBER, CUSTOMER_NAME, ACCOUNT_TYPE, CURRENT_BALANCE, INT_RATE, STATUS, JOINT_HOLD_FLAG
        FROM DEPOSITS_BALANCE_FILE_DEPD0586
        WHERE CURRENT_BALANCE IS NOT NULL AND CURRENT_BALANCE != ''
    """)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "account_no": row[0],
            "customer_name": row[1] or "-",
            "account_type": row[2] or "-",
            "current_balance": row[3],
            "int_rate": row[4],
            "status": row[5] or "-",
            "joint": row[6] or "-"
        })
    return data

# ==========================================
# 11. Interest Rate Exceptions (DEPD0650)
# ==========================================
@app.get("/api/interest-rate-exceptions")
def get_interest_rate_exceptions():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ACCOUNT_NUMBER, CUSTOMER_NAME, SANCTION_AMOUNT, PRODUCT_INT_RATE, EFFECTIVE_INT_RATE
        FROM EXCEPTION_REPORT_FOR_INTEREST_RATES_VARIATION_DEPD0650
    """)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "account_no": row[0],
            "customer_name": row[1],
            "sanction_amount": row[2],
            "product_rate": row[3],
            "effective_rate": row[4]
        })
    return data

# ==========================================
# 12. Least Transaction Volume (LOND2482)
# ==========================================
@app.get("/api/least-transactions")
def get_least_transactions(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = "WHERE ID IS NOT NULL AND ID != ''"
    params = []
    if branch_code != "ALL":
        where_clause += " AND BRANCH_CODE = ?"
        params.append(branch_code)
        
    cursor.execute(f"""
        SELECT TOP 10 ID, 
            CAST(ISNULL(NULLIF(NO_OF_TXNS_DEBIT, ''), '0') AS FLOAT) as debit,
            CAST(ISNULL(NULLIF(NO_OF_TXNS_CREDIT, ''), '0') AS FLOAT) as credit,
            CAST(ISNULL(NULLIF(MEMO_HITS, ''), '0') AS FLOAT) as hits
        FROM ID_LEAST_TRANSACTION_LOND2482
        {where_clause}
        ORDER BY (CAST(ISNULL(NULLIF(NO_OF_TXNS_DEBIT, ''), '0') AS FLOAT) + CAST(ISNULL(NULLIF(NO_OF_TXNS_CREDIT, ''), '0') AS FLOAT)) ASC
    """, params)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "id": row[0].strip(),
            "debit": float(row[1]),
            "credit": float(row[2]),
            "hits": float(row[3])
        })
    return data

# ==========================================
# 13. Dynamic Report Explorer
# ==========================================
@app.get("/api/loan-npa-summary")
def get_loan_npa_summary(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = ""
    params = []
    if branch_code != "ALL":
        where_clause = "WHERE BRANCH_CODE = ?"
        params = [branch_code]
        
    try:
        cursor.execute(f"SELECT SUM(TRY_CAST(DR_BALANCE AS FLOAT)) FROM BAL_IN_LOAN_ACC_GLCC_WISE_DET {where_clause}", params)
        total_loans = cursor.fetchone()[0] or 0
    except:
        total_loans = 0
        
    try:
        cursor.execute(f"SELECT SUM(TRY_CAST(BAL_OUTSTAND AS FLOAT)) FROM NPA_STMT {where_clause}", params)
        total_npa_outstanding = cursor.fetchone()[0] or 0
    except:
        total_npa_outstanding = 0
        
    try:
        cursor.execute(f"SELECT SUM(TRY_CAST(INCA AS FLOAT)) FROM NPA_STMT {where_clause}", params)
        npa_covered = cursor.fetchone()[0] or 0
    except:
        npa_covered = 0
        
    conn.close()
    
    return {
        "total_loans": abs(total_loans),
        "total_npa": abs(total_npa_outstanding),
        "npa_covered": abs(npa_covered)
    }

@app.get("/api/npa-branch-wise")
@lru_cache(maxsize=128)
def get_npa_branch_wise(branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_npa, params_npa = get_date_filter_sql(period, "NPA_STMT", "WHERE")
    
    if branch_code != "ALL":
        where_npa += " AND n.BRANCH_CODE = ?" if "WHERE" in where_npa else " WHERE n.BRANCH_CODE = ?"
        params_npa.append(branch_code)
        
    if "WHERE" in where_npa:
        where_npa += " AND n.BRANCH_CODE IS NOT NULL AND n.BRANCH_CODE != ''"
    else:
        where_npa = "WHERE n.BRANCH_CODE IS NOT NULL AND n.BRANCH_CODE != ''"
        
    try:
        cursor.execute(f"""
            SELECT 
                COALESCE((SELECT TOP 1 BRANCH_NAME FROM LOANSBALANCEFILE_LOND2390 b WHERE b.BRANCH_CODE = n.BRANCH_CODE), n.BRANCH_CODE) as BRANCH_NAME,
                SUM(TRY_CAST(BAL_OUTSTAND AS FLOAT)) as npa, 
                SUM(TRY_CAST(INCA AS FLOAT)) as covered
            FROM NPA_STMT n
            {where_npa}
            GROUP BY n.BRANCH_CODE
            ORDER BY npa DESC
        """, params_npa)
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "NPA": abs(r[1] or 0), "Covered": abs(r[2] or 0)} for r in rows]
    except Exception as e:
        print(f"Error in NPA: {e}")
        data = []
    conn.close()
    return data

@app.get("/api/loan-branch-wise")
@lru_cache(maxsize=128)
def get_loan_branch_wise(branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    where_loan, params_loan = get_date_filter_sql(period, "BAL_IN_LOAN_ACC_GLCC_WISE_DET")
    
    if branch_code != "ALL":
        where_loan += " AND BRANCH_CODE = ?" if "WHERE" in where_loan else " WHERE BRANCH_CODE = ?"
        params_loan.append(branch_code)
        
    try:
        cursor.execute(f"""
            SELECT BRANCH_NAME, SUM(TRY_CAST(DR_BALANCE AS FLOAT)) as loans
            FROM BAL_IN_LOAN_ACC_GLCC_WISE_DET
            {where_loan}
            GROUP BY BRANCH_NAME
            ORDER BY loans DESC
        """, params_loan)
        rows = cursor.fetchall()
        data = [{"name": r[0][:10] if r[0] else "Unknown", "Loans": abs(r[1] or 0)} for r in rows]
    except:
        data = []
    conn.close()
    return data

@app.get("/api/loan-type-distribution")
@lru_cache(maxsize=128)
def get_loan_type_distribution(branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    where_clause, params = get_date_filter_sql(period, "BAL_IN_LOAN_ACC_GLCC_WISE_DET")
    
    if branch_code != "ALL":
        where_clause += " AND BRANCH_CODE = ?" if "WHERE" in where_clause else " WHERE BRANCH_CODE = ?"
        params.append(branch_code)
    try:
        cursor.execute(f"""
            SELECT TOP 10 PRODUCT_NAME, SUM(TRY_CAST(DR_BALANCE AS FLOAT)) as amount
            FROM BAL_IN_LOAN_ACC_GLCC_WISE_DET
            {where_clause}
            GROUP BY PRODUCT_NAME
            ORDER BY amount DESC
        """, params)
        rows = cursor.fetchall()
        data = [{"name": r[0][:30] if r[0] else "Unknown", "raw_name": r[0] if r[0] else "Unknown", "value": abs(r[1] or 0)} for r in rows]
    except:
        data = []
    conn.close()
    return data

@app.get("/api/loan-type-branches")
@lru_cache(maxsize=128)
def get_loan_type_branches(product_name: str, branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    where_clause, params = get_date_filter_sql(period, "BAL_IN_LOAN_ACC_GLCC_WISE_DET")
    
    where_clause += " AND PRODUCT_NAME = ?" if "WHERE" in where_clause else " WHERE PRODUCT_NAME = ?"
    params.append(product_name)
    
    if branch_code != "ALL":
        where_clause += " AND BRANCH_CODE = ?"
        params.append(branch_code)
        
    try:
        cursor.execute(f"""
            SELECT BRANCH_NAME, SUM(TRY_CAST(DR_BALANCE AS FLOAT)) as amount
            FROM BAL_IN_LOAN_ACC_GLCC_WISE_DET
            {where_clause}
            GROUP BY BRANCH_NAME
            ORDER BY amount DESC
        """, params)
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "value": abs(r[1] or 0)} for r in rows]
    except:
        data = []
    conn.close()
    return data

@app.get("/api/reports")
def get_reports():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
    rows = cursor.fetchall()
    conn.close()
    reports = []
    for row in rows:
        tname = row[0]
        # Ignore system/metadata tables if any, though all here are user tables
        if tname != 'sqlite_sequence':
            reports.append({"name": tname, "label": tname.replace('_', ' ').title()})
    return reports

@app.get("/api/report-stats/{table_name}")
def get_report_stats(table_name: str, branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Secure validation of table name
    cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = ?", (table_name,))
    if not cursor.fetchone():
        conn.close()
        return {"error": "Invalid table"}
        
    # Get column names
    cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?", (table_name,))
    columns = [row[0] for row in cursor.fetchall()]
    
    # Exclude PII and boilerplate columns from analysis
    pii_keywords = ['NAME', 'ACCOUNT', 'ACCT', 'ID', 'CHEQUE', 'BRANCH', 'PROC_DATE', 'REPORT', 'PAGENO']
    analysis_cols = [c for c in columns if not any(k in c.upper() for k in pii_keywords) and c != 'id']
    
    where_clause = ""
    params = []
    if branch_code != "ALL" and "BRANCH_CODE" in columns:
        where_clause = "WHERE BRANCH_CODE = ?"
        params = [branch_code]
    
    # We will fetch up to 1000 rows to compute some basic stats in Python
    cursor.execute(f"SELECT * FROM {table_name} {where_clause}", params)
    rows = cursor.fetchmany(1000)
    
    cursor.execute(f"SELECT COUNT(*) FROM {table_name} {where_clause}", params)
    total_rows = cursor.fetchone()[0]
    conn.close()
    
    # Compute aggregate metrics
    metrics = []
    for col in analysis_cols:
        col_idx = columns.index(col)
        total_sum = 0
        valid_numeric = 0
        for row in rows:
            val = row[col_idx]
            if val:
                try:
                    # Clean the string for float conversion
                    clean_val = str(val).replace(',', '').strip()
                    if clean_val and clean_val != '-':
                        total_sum += float(clean_val)
                        valid_numeric += 1
                except ValueError:
                    pass
        
        if valid_numeric > (len(rows) * 0.1): # If at least 10% of rows are numeric, it's a numeric column
            metrics.append({
                "column": col.replace('_', ' ').title(),
                "sum": total_sum,
                "avg": total_sum / valid_numeric if valid_numeric > 0 else 0
            })
            
    # Add distinct counts for PII columns (useful for MIS dashboards)
    for col in columns:
        if col == 'id': continue
        if any(k in col.upper() for k in pii_keywords):
            # Calculate distinct count
            col_idx = columns.index(col)
            distinct_vals = set(str(row[col_idx]).strip() for row in rows if row[col_idx])
            if distinct_vals:
                metrics.append({
                    "column": f"Unique {col.replace('_', ' ').title()}",
                    "sum": len(distinct_vals),
                    "avg": 0
                })
            
    # Compute categorical distributions for pie charts
    distribution = []
    cat_col = None
    
    # Try to find a non-PII categorical column
    for col in columns:
        if col == 'id' or any(k in col.upper() for k in pii_keywords):
            continue
        if col not in analysis_cols:
            continue
        cat_col = col
        break

    if cat_col:
        col_idx = columns.index(cat_col)
        freq = {}
        # We want to ignore junk symbols that shouldn't be plotted
        junk_chars = set("-=>*#_| ")
        
        for row in rows:
            val = str(row[col_idx]).strip() if row[col_idx] else ""
            if val and not all(c in junk_chars for c in val):
                freq[val] = freq.get(val, 0) + 1
        
        distribution = [{"name": k[:30], "value": v} for k, v in freq.items()]

    return {
        "table_name": table_name,
        "total_rows": total_rows,
        "metrics": metrics,
        "distribution": sorted(distribution, key=lambda x: x["value"], reverse=True),
        "distribution_column": cat_col.replace('_', ' ').title() if cat_col else None
    }

@app.get("/api/account-metrics")
def get_account_metrics(branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    data = {"opened": 0, "closed": 0}
    
    try:
        where_sql, params = get_date_filter_sql(period, "ACCOUNT_OPENED_REPORT")
        if branch_code != "ALL":
            where_sql += " AND BRANCH_CODE = ?" if "WHERE" in where_sql else " WHERE BRANCH_CODE = ?"
            params.append(branch_code)
        
        cursor.execute(f"SELECT COUNT(*) FROM ACCOUNT_OPENED_REPORT {where_sql}", params)
        res = cursor.fetchone()
        if res: data["opened"] = res[0]
        
        where_sql, params = get_date_filter_sql(period, "ACCOUNT_CLOSED_REPORT")
        if branch_code != "ALL":
            where_sql += " AND BRANCH_CODE = ?" if "WHERE" in where_sql else " WHERE BRANCH_CODE = ?"
            params.append(branch_code)
            
        cursor.execute(f"SELECT COUNT(*) FROM ACCOUNT_CLOSED_REPORT {where_sql}", params)
        res = cursor.fetchone()
        if res: data["closed"] = res[0]
        
    except Exception as e:
        print(f"Error getting account metrics: {e}")
        
    conn.close()
    return data

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        from app.parser.dispatcher import process_file
        
        # Ensure uploads directory exists
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, file.filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Process file directly into DB
        process_file(file_path)
        
        return {"status": "success", "message": f"File {file.filename} processed successfully"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api:app", host="0.0.0.0", port=8000, reload=True)
