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
    from app.db.database import engine
    return engine.raw_connection()

def get_date_filter_sql(period: str, table_name: str, prefix: str = "WHERE", date_col: str = "PROC_DATE"):
    """Generates SQL condition for filtering by period based on the max date in the table, or by exact date."""
    if period == "ALL" or not period:
        return "", []
        
    import re
    if re.match(r"^\d{4}-\d{2}-\d{2}$", period):
        sql = f" {prefix} CONVERT(date, {table_name}.{date_col}, 103) = CONVERT(date, ?, 120) "
        return sql, [period]
        
    days = 0
    if period == "7D": days = 7
    elif period == "30D": days = 30
    elif period == "6M": days = 180
    else: return "", []
    
    sql = f" {prefix} CONVERT(date, {table_name}.{date_col}, 103) >= DATEADD(day, -?, (SELECT MAX(CONVERT(date, {date_col}, 103)) FROM {table_name})) "
    return sql, [days]


# ==========================================
# 0. Branches List (Dynamic — finds from ANY table with BRANCH_CODE)
# ==========================================
@app.get("/api/branches")
def get_branches():
    conn = get_db_connection()
    cursor = conn.cursor()
    branches = []
    
    try:
        # Find all tables that have a BRANCH_CODE column
        cursor.execute("""
            SELECT DISTINCT TABLE_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE COLUMN_NAME = 'BRANCH_CODE'
        """)
        tables_with_branch = [row[0] for row in cursor.fetchall()]
        
        # Try each table until we find one with data
        for table in tables_with_branch:
            try:
                # Check if this table also has BRANCH_NAME
                cursor.execute("""
                    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = ? AND COLUMN_NAME = 'BRANCH_NAME'
                """, (table,))
                has_branch_name = cursor.fetchone()[0] > 0
                
                if has_branch_name:
                    cursor.execute(f"""
                        SELECT DISTINCT BRANCH_CODE, BRANCH_NAME 
                        FROM {table}
                        WHERE BRANCH_CODE IS NOT NULL AND BRANCH_CODE != ''
                        ORDER BY BRANCH_CODE
                    """)
                else:
                    cursor.execute(f"""
                        SELECT DISTINCT BRANCH_CODE, BRANCH_CODE
                        FROM {table}
                        WHERE BRANCH_CODE IS NOT NULL AND BRANCH_CODE != ''
                        ORDER BY BRANCH_CODE
                    """)
                
                rows = cursor.fetchall()
                if rows:
                    for row in rows:
                        branches.append({"code": row[0].strip(), "name": row[1].strip() if row[1] else "Unknown"})
                    break  # Found data, stop looking
            except:
                continue
                
    except Exception as e:
        print(f"Could not load branches: {e}")
        
    conn.close()
    return branches


# ==========================================
# 1. KPI Summary (Deposit, NPA, Opened/Closed)
# ==========================================
@app.get("/api/kpi-summary")
@lru_cache(maxsize=128)
def get_kpi_summary(branch_code: str = "ALL", period: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    data = {
        "total_deposits": 0,
        "total_npa": 0,
        "accounts_opened": 0,
        "accounts_closed": 0,
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
    except Exception as e:
        print(f"KPI deposits skipped (table may not exist): {e}")
        
    try:
        # Total NPA
        where_npa, params_npa = get_date_filter_sql(period, "NPA_STMT", "WHERE")
        if branch_code != "ALL":
            where_npa += " AND BRANCH_CODE = ?" if "WHERE" in where_npa else " WHERE BRANCH_CODE = ?"
            params_npa.append(branch_code)
        cursor.execute(f"SELECT SUM(TRY_CAST(BAL_OUTSTAND AS FLOAT)) FROM NPA_STMT {where_npa}", params_npa)
        res = cursor.fetchone()
        if res and res[0]: data["total_npa"] = abs(res[0])
    except Exception as e:
        print(f"KPI NPA skipped (table may not exist): {e}")
    
    try:
        # Accounts Opened
        where_op, params_op = get_date_filter_sql(period, "ACCOUNT_OPENED_REPORT")
        if branch_code != "ALL":
            where_op += " AND BRANCH_CODE = ?" if "WHERE" in where_op else " WHERE BRANCH_CODE = ?"
            params_op.append(branch_code)
        cursor.execute(f"SELECT COUNT(*) FROM ACCOUNT_OPENED_REPORT {where_op}", params_op)
        res = cursor.fetchone()
        if res: data["accounts_opened"] = res[0]
    except Exception as e:
        print(f"KPI opened skipped (table may not exist): {e}")
    
    try:
        # Accounts Closed
        where_cl, params_cl = get_date_filter_sql(period, "ACCOUNT_CLOSED_REPORT")
        if branch_code != "ALL":
            where_cl += " AND BRANCH_CODE = ?" if "WHERE" in where_cl else " WHERE BRANCH_CODE = ?"
            params_cl.append(branch_code)
        cursor.execute(f"SELECT COUNT(*) FROM ACCOUNT_CLOSED_REPORT {where_cl}", params_cl)
        res = cursor.fetchone()
        if res: data["accounts_closed"] = res[0]
    except Exception as e:
        print(f"KPI closed skipped (table may not exist): {e}")
        
    try:
        # Branches Reporting
        if branch_code == "ALL":
            cursor.execute("SELECT COUNT(DISTINCT BRANCH_CODE) FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME = 'BRANCH_CODE'")
            res = cursor.fetchone()
            if res and res[0]: data["branches_reporting"] = res[0]
        else:
            data["branches_reporting"] = 1
    except:
        pass
            
    conn.close()
    return data


# ==========================================
# 2. Account Metrics (Opened + Closed counts)
# ==========================================
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
    except Exception as e:
        print(f"Account opened count skipped: {e}")
    
    try:
        where_sql, params = get_date_filter_sql(period, "ACCOUNT_CLOSED_REPORT")
        if branch_code != "ALL":
            where_sql += " AND BRANCH_CODE = ?" if "WHERE" in where_sql else " WHERE BRANCH_CODE = ?"
            params.append(branch_code)
            
        cursor.execute(f"SELECT COUNT(*) FROM ACCOUNT_CLOSED_REPORT {where_sql}", params)
        res = cursor.fetchone()
        if res: data["closed"] = res[0]
    except Exception as e:
        print(f"Account closed count skipped: {e}")
        
    conn.close()
    return data


# ==========================================
# 3. Opened Branch-Wise
# ==========================================
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


# ==========================================
# 4. Closed Branch-Wise
# ==========================================
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


# ==========================================
# 5. Deposit Branch-Wise
# ==========================================
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


# ==========================================
# 6. Deposits by Account Type
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
        
    try:
        cursor.execute(f"""
            SELECT TOP 8 ACCOUNT_TYPE, COUNT(*) as cnt
            FROM DEPOSITS_BALANCE_FILE_DEPD0586
            {where_clause}
            GROUP BY ACCOUNT_TYPE
            ORDER BY cnt DESC
        """, params)
        rows = cursor.fetchall()
        data = [{"name": row[0], "value": row[1]} for row in rows]
    except Exception as e:
        print(f"Error getting deposits by type: {e}")
        data = []
    conn.close()
    return data


# ==========================================
# 7. Deposit Balances Table
# ==========================================
@app.get("/api/deposit-balances")
def get_deposit_balances():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT TOP 10 ACCOUNT_NUMBER, CUSTOMER_NAME, ACCOUNT_TYPE, CURRENT_BALANCE, INT_RATE, STATUS, JOINT_HOLD_FLAG
            FROM DEPOSITS_BALANCE_FILE_DEPD0586
            WHERE CURRENT_BALANCE IS NOT NULL AND CURRENT_BALANCE != ''
        """)
        rows = cursor.fetchall()
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
    except Exception as e:
        print(f"Error getting deposit balances: {e}")
        data = []
    conn.close()
    return data


# ==========================================
# 8. NPA Summary (Loan + NPA totals)
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
        
    total_npa_outstanding = 0
    npa_covered = 0
    
    try:
        cursor.execute(f"SELECT SUM(TRY_CAST(BAL_OUTSTAND AS FLOAT)) FROM NPA_STMT {where_clause}", params)
        res = cursor.fetchone()
        if res and res[0]: total_npa_outstanding = res[0]
    except:
        pass
        
    try:
        cursor.execute(f"SELECT SUM(TRY_CAST(INCA AS FLOAT)) FROM NPA_STMT {where_clause}", params)
        res = cursor.fetchone()
        if res and res[0]: npa_covered = res[0]
    except:
        pass
        
    conn.close()
    
    return {
        "total_npa": abs(total_npa_outstanding),
        "npa_covered": abs(npa_covered)
    }


# ==========================================
# 9. NPA Branch-Wise
# ==========================================
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
                n.BRANCH_CODE as BRANCH_NAME,
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
        print(f"Error in NPA branch-wise: {e}")
        data = []
    conn.close()
    return data


# ==========================================
# 10. Dynamic Report List
# ==========================================
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
        if tname != 'sqlite_sequence':
            reports.append({"name": tname, "label": tname.replace('_', ' ').title()})
    return reports


# ==========================================
# 11. Dynamic Report Stats
# ==========================================
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
                    clean_val = str(val).replace(',', '').strip()
                    if clean_val and clean_val != '-':
                        total_sum += float(clean_val)
                        valid_numeric += 1
                except ValueError:
                    pass
        
        if valid_numeric > (len(rows) * 0.1):
            metrics.append({
                "column": col.replace('_', ' ').title(),
                "sum": total_sum,
                "avg": total_sum / valid_numeric if valid_numeric > 0 else 0
            })
            
    # Add distinct counts for PII columns
    for col in columns:
        if col == 'id': continue
        if any(k in col.upper() for k in pii_keywords):
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


# ==========================================
# 12. File Summary (Dynamic)
# ==========================================
@app.get("/api/file-summary")
def get_file_summary(branch_code: str = 'ALL'):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
    tables = [row[0] for row in cursor.fetchall()]
    
    file_stats = []
    
    for table in tables:
        try:
            query = f"SELECT COUNT(*) FROM {table}"
            params = []
            
            if branch_code != 'ALL':
                branch_col = None
                cursor.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{table}'")
                cols = [c[0].upper() for c in cursor.fetchall()]
                
                if 'BRANCH_CODE' in cols:
                    branch_col = 'BRANCH_CODE'
                elif 'BRANCH' in cols:
                    branch_col = 'BRANCH'
                    
                if branch_col:
                    query += f" WHERE {branch_col} = ?"
                    params.append(branch_code)
                    
            cursor.execute(query, params)
            count = cursor.fetchone()[0]
            
            if count > 0:
                file_stats.append({
                    "fileName": table,
                    "date": "2025-04-25",
                    "records": count,
                    "amount": count * 1500,
                    "status": "Processed",
                    "type": "MIS Report"
                })
        except Exception as e:
            continue
            
    conn.close()
    return file_stats


# ==========================================
# 13. File Upload
# ==========================================
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
