import os
import re

api_path = os.path.join('backend', 'app', 'api.py')
with open(api_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Helper logic to insert
helper_code = """
def get_grouping_sql(branch_code, table_name, alias="A"):
    is_regional = (branch_code == "ALL")
    if is_regional:
        select_name = f"COALESCE(BN_{table_name}.REGIONAL_OFFICE, 'Unknown Region')"
        join_sql = f"LEFT JOIN BRANCH_NETWORK BN_{table_name} ON {alias}.BRANCH_CODE = BN_{table_name}.BRANCH_CODE"
        group_col = f"BN_{table_name}.REGIONAL_OFFICE"
    else:
        select_name = f"{alias}.BRANCH_NAME"
        join_sql = ""
        group_col = f"{alias}.BRANCH_NAME"
    return select_name, join_sql, group_col
"""
if "def get_grouping_sql" not in content:
    content = content.replace("def get_branch_filter_sql", helper_code + "\ndef get_branch_filter_sql")

# 1. get_opened_branch_wise
new_opened = """def get_opened_branch_wise(branch_code: str = "ALL", period: str = "ALL", start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_sql, params = get_date_filter_sql(period, "ACCOUNT_OPENED_REPORT", date_col="OPENED_DATE", start_date=start_date, end_date=end_date)
    branch_sql, branch_params = get_branch_filter_sql(branch_code, "AND" if "WHERE" in where_sql.upper() else "WHERE", "BRANCH_CODE")
    where_sql += branch_sql
    params.extend(branch_params)
    
    select_name, join_sql, group_col = get_grouping_sql(branch_code, "ACCOUNT_OPENED_REPORT", "A")
    where_sql = where_sql.replace("ACCOUNT_OPENED_REPORT.", "A.")
    branch_sql = branch_sql.replace("BRANCH_CODE", "A.BRANCH_CODE")
    
    try:
        cursor.execute(f\"\"\"
            SELECT {select_name} as name, COUNT(*) as cnt,
                   SUM(CASE WHEN PRODUCT LIKE '6%' THEN 1 ELSE 0 END) as loan_accounts,
                   SUM(CASE WHEN PRODUCT NOT LIKE '6%' THEN 1 ELSE 0 END) as deposit_accounts
            FROM ACCOUNT_OPENED_REPORT A
            {join_sql}
            {where_sql}
            GROUP BY {group_col}
            ORDER BY cnt DESC
        \"\"\", params)
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "value": r[1], "loan_accounts": r[2], "deposit_accounts": r[3]} for r in rows]
    except Exception as e:
        import pyodbc
        if not (isinstance(e, pyodbc.Error) and len(e.args) > 0 and e.args[0] == '42S02'):
            print(f"Error calculating branch-wise opened: {e}")
        data = []
    conn.close()
    return data"""
content = re.sub(r'def get_opened_branch_wise.*?return data', new_opened, content, flags=re.DOTALL)

# 2. get_closed_branch_wise
new_closed = """def get_closed_branch_wise(branch_code: str = "ALL", period: str = "ALL", start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_sql, params = get_date_filter_sql(period, "ACCOUNT_CLOSED_REPORT", date_col="CLOSED_DATE", start_date=start_date, end_date=end_date)
    branch_sql, branch_params = get_branch_filter_sql(branch_code, "AND" if "WHERE" in where_sql.upper() else "WHERE", "BRANCH_CODE")
    where_sql += branch_sql
    params.extend(branch_params)
    
    select_name, join_sql, group_col = get_grouping_sql(branch_code, "ACCOUNT_CLOSED_REPORT", "A")
    where_sql = where_sql.replace("ACCOUNT_CLOSED_REPORT.", "A.")
        
    try:
        cursor.execute(f\"\"\"
            SELECT {select_name} as name, COUNT(*) as cnt,
                   SUM(CASE WHEN PRODUCT LIKE '6%' THEN 1 ELSE 0 END) as loan_accounts,
                   SUM(CASE WHEN PRODUCT NOT LIKE '6%' THEN 1 ELSE 0 END) as deposit_accounts
            FROM ACCOUNT_CLOSED_REPORT A
            {join_sql}
            {where_sql}
            GROUP BY {group_col}
            ORDER BY cnt DESC
        \"\"\", params)
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "value": r[1], "loan_accounts": r[2], "deposit_accounts": r[3]} for r in rows]
    except Exception as e:
        import pyodbc
        if not (isinstance(e, pyodbc.Error) and len(e.args) > 0 and e.args[0] == '42S02'):
            print(f"Error calculating branch-wise closed: {e}")
        data = []
    conn.close()
    return data"""
content = re.sub(r'def get_closed_branch_wise.*?return data', new_closed, content, flags=re.DOTALL)


# 3. get_total_branch_wise
new_total = """def get_total_branch_wise(branch_code: str = "ALL", period: str = "ALL", start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_dep, params_dep = get_date_filter_sql(period, "DEPOSITS_BALANCE_FILE_DEPD0586", start_date=start_date, end_date=end_date)
    branch_sql, branch_params = get_branch_filter_sql(branch_code, "AND" if "WHERE" in where_dep.upper() else "WHERE", "BRANCH_CODE")
    where_dep += branch_sql
    params_dep.extend(branch_params)
    
    where_loan, params_loan = get_date_filter_sql(period, "BAL_IN_LOAN_ACC_GLCC_WISE_DET", start_date=start_date, end_date=end_date)
    branch_sql, branch_params = get_branch_filter_sql(branch_code, "AND" if "WHERE" in where_loan.upper() else "WHERE", "BRANCH_CODE")
    where_loan += branch_sql
    params_loan.extend(branch_params)
    
    select_name_d, join_sql_d, group_col_d = get_grouping_sql(branch_code, "DEPOSITS_BALANCE_FILE_DEPD0586", "D_INNER")
    where_dep = where_dep.replace("DEPOSITS_BALANCE_FILE_DEPD0586.", "D_INNER.")
    
    select_name_l, join_sql_l, group_col_l = get_grouping_sql(branch_code, "BAL_IN_LOAN_ACC_GLCC_WISE_DET", "L_INNER")
    where_loan = where_loan.replace("BAL_IN_LOAN_ACC_GLCC_WISE_DET.", "L_INNER.")
        
    try:
        cursor.execute(f\"\"\"
            SELECT 
                COALESCE(D.name, L.name) AS BRANCH_NAME,
                ISNULL(D.dep_cnt, 0) + ISNULL(L.loan_cnt, 0) AS cnt,
                ISNULL(L.loan_cnt, 0) AS loan_accounts,
                ISNULL(D.dep_cnt, 0) AS deposit_accounts
            FROM (
                SELECT {select_name_d} as name, COUNT(DISTINCT D_INNER.ACCOUNT_NUMBER) as dep_cnt
                FROM DEPOSITS_BALANCE_FILE_DEPD0586 D_INNER
                {join_sql_d}
                {where_dep}
                GROUP BY {group_col_d}
            ) D
            FULL OUTER JOIN (
                SELECT {select_name_l} as name, COUNT(DISTINCT L_INNER.ACCOUNT) as loan_cnt
                FROM BAL_IN_LOAN_ACC_GLCC_WISE_DET L_INNER
                {join_sql_l}
                {where_loan}
                GROUP BY {group_col_l}
            ) L ON D.name = L.name
            ORDER BY cnt DESC
        \"\"\", params_dep + params_loan)
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "value": r[1], "loan_accounts": r[2], "deposit_accounts": r[3]} for r in rows]
    except Exception as e:
        import pyodbc
        if not (isinstance(e, pyodbc.Error) and len(e.args) > 0 and e.args[0] == '42S02'):
            print(f"Error calculating total branch-wise: {e}")
        data = []
    conn.close()
    return data"""
content = re.sub(r'def get_total_branch_wise.*?return data', new_total, content, flags=re.DOTALL)

# 4. get_deposit_branch_wise
new_deposit = """def get_deposit_branch_wise(
    branch_code: str = "ALL",
    period: str = "ALL"
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        where_dep, params_dep = get_date_filter_sql(
            period,
            "DEPOSITS_BALANCE_FILE_DEPD0586"
        )
        branch_condition = ""
        branch_sql, branch_params = get_branch_filter_sql(branch_code, "AND" if "WHERE" in where_dep.upper() else "WHERE", "BRANCH_CODE")
        branch_condition += branch_sql
        params_dep.extend(branch_params)

        select_name, join_sql, group_col = get_grouping_sql(branch_code, "DEPOSITS_BALANCE_FILE_DEPD0586", "D")
        where_dep = where_dep.replace("DEPOSITS_BALANCE_FILE_DEPD0586.", "D.")
        branch_condition = branch_condition.replace("BRANCH_CODE", "D.BRANCH_CODE")

        query = f\"\"\"
            WITH LatestAccounts AS (
                SELECT
                    D.ID,
                    D.ACCOUNT_NUMBER,
                    D.BRANCH_CODE,
                    D.BRANCH_NAME,
                    D.CURRENT_BALANCE,
                    {select_name} as grouped_name,
                    ROW_NUMBER() OVER (
                        PARTITION BY
                            D.BRANCH_CODE,
                            D.ACCOUNT_NUMBER
                        ORDER BY D.ID DESC
                    ) AS rn
                FROM DEPOSITS_BALANCE_FILE_DEPD0586 D
                {join_sql}
                {where_dep}
                {branch_condition}
            )
            SELECT
                grouped_name,
                SUM(TRY_CAST(REPLACE(ISNULL(CURRENT_BALANCE, '0'), ',', '') AS FLOAT)) AS TOTAL_DEPOSITS,
                COUNT(*) AS ACCOUNT_COUNT
            FROM LatestAccounts
            WHERE rn = 1
            GROUP BY grouped_name
            ORDER BY TOTAL_DEPOSITS DESC
        \"\"\"
        cursor.execute(query, params_dep)
        rows = cursor.fetchall()
        data = []
        for row in rows:
            data.append({
                "branch_code": "",
                "name": str(row[0]).strip() if row[0] else "Unknown",
                "value": float(row[1]) if row[1] is not None else 0.0,
                "account_count": int(row[2]) if row[2] is not None else 0,
            })
        return data
    except Exception as e:
        import pyodbc
        if not (isinstance(e, pyodbc.Error) and len(e.args) > 0 and e.args[0] == '42S02'):
            print(f"Error calculating branch-wise deposits: {e}")
        return []
    finally:
        conn.close()"""
content = re.sub(r'def get_deposit_branch_wise.*?conn\.close\(\)', new_deposit, content, flags=re.DOTALL)

# 5. get_loan_branch_wise
new_loan = """def get_loan_branch_wise(branch_code: str = "ALL", period: str = "ALL", start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    where_loan, params_loan = get_date_filter_sql(period, "BAL_IN_LOAN_ACC_GLCC_WISE_DET", start_date=start_date, end_date=end_date)
    
    branch_sql, branch_params = get_branch_filter_sql(branch_code, "AND" if "WHERE" in where_loan.upper() else "WHERE", "BRANCH_CODE")
    where_loan += branch_sql
    params_loan.extend(branch_params)
    
    select_name, join_sql, group_col = get_grouping_sql(branch_code, "BAL_IN_LOAN_ACC_GLCC_WISE_DET", "L")
    where_loan = where_loan.replace("BAL_IN_LOAN_ACC_GLCC_WISE_DET.", "L.")
        
    try:
        cursor.execute(f\"\"\"
            SELECT {select_name} as name, SUM(TRY_CAST(DR_BALANCE AS FLOAT)) as loans
            FROM BAL_IN_LOAN_ACC_GLCC_WISE_DET L
            {join_sql}
            {where_loan}
            GROUP BY {group_col}
            ORDER BY loans DESC
        \"\"\", params_loan)
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "Loans": float(r[1] or 0)} for r in rows]
    except:
        data = []
    conn.close()
    return data"""
content = re.sub(r'def get_loan_branch_wise.*?return data', new_loan, content, flags=re.DOTALL)

# 6. get_npa_branch_wise
new_npa = """def get_npa_branch_wise(branch_code: str = "ALL", period: str = "ALL", start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_npa, params_npa = get_date_filter_sql(period, "LIST_OF_NPA_ACCOUNTS", "WHERE", start_date=start_date, end_date=end_date)
    
    branch_sql, branch_params = get_branch_filter_sql(branch_code, "AND" if "WHERE" in where_npa.upper() else "WHERE", "BRANCH_CODE")
    where_npa += branch_sql
    params_npa.extend(branch_params)
        
    if "WHERE" in where_npa:
        where_npa += " AND NPA.BRANCH_CODE IS NOT NULL AND NPA.BRANCH_CODE != ''"
    else:
        where_npa = "WHERE NPA.BRANCH_CODE IS NOT NULL AND NPA.BRANCH_CODE != ''"
    
    select_name, join_sql, group_col = get_grouping_sql(branch_code, "LIST_OF_NPA_ACCOUNTS", "NPA")
    where_npa = where_npa.replace("LIST_OF_NPA_ACCOUNTS.", "NPA.")
        
    try:
        cursor.execute(f\"\"\"
            SELECT 
                {select_name} as name,
                SUM(TRY_CAST(REPLACE(ISNULL(OUTSTANDING, '0'), ',', '') AS FLOAT)) as npa
            FROM LIST_OF_NPA_ACCOUNTS NPA
            {join_sql}
            {where_npa}
            GROUP BY {group_col}
            ORDER BY npa DESC
        \"\"\", params_npa)
        rows = cursor.fetchall()
        data = [{"name": r[0][:15] if r[0] else "Unknown", "NPA": float(r[1] or 0)} for r in rows]
    except Exception as e:
        import pyodbc
        if not (isinstance(e, pyodbc.Error) and len(e.args) > 0 and e.args[0] == '42S02'):
            print(f"Error in NPA: {e}")
        data = []
    conn.close()
    return data"""
content = re.sub(r'def get_npa_branch_wise.*?return data', new_npa, content, flags=re.DOTALL)

with open(api_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to api.py successfully.")
