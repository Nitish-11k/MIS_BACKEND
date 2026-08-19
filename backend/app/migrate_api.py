import re

with open('api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add get_fact_date_filter_sql
if 'def get_fact_date_filter_sql' not in content:
    fact_date_filter_code = """
def get_fact_date_filter_sql(period: str = None, table_name: str = "", prefix: str = "WHERE", date_col: str = "snapshot_date", start_date: str = None, end_date: str = None):
    if start_date and end_date:
        sql = f" {prefix} {table_name}.{date_col} BETWEEN CONVERT(date, ?, 120) AND CONVERT(date, ?, 120) "
        return sql, [start_date, end_date]
    elif start_date:
        sql = f" {prefix} {table_name}.{date_col} = CONVERT(date, ?, 120) "
        return sql, [start_date]

    if period == "ALL" or not period:
        return "", []

    import re
    if re.match(r"^\d{4}-\d{2}-\d{2}$", period):
        sql = f" {prefix} {table_name}.{date_col} = CONVERT(date, ?, 120) "
        return sql, [period]

    days = 0
    if period == "7D": days = 7
    elif period == "15D": days = 15
    elif period == "30D": days = 30
    elif period == "90D": days = 90
    elif period == "6M": days = 180
    elif period == "1Y": days = 365
    elif period == "YTD": days = 365
    else: return "", []

    sql = f" {prefix} {table_name}.{date_col} >= DATEADD(day, -?, (SELECT MAX({date_col}) FROM {table_name})) "
    return sql, [days]
"""
    content = content.replace('def get_date_filter_sql', fact_date_filter_code + '\ndef get_date_filter_sql')

# 2. Replace get_kpi_summary
new_kpi = """@app.get("/api/kpi-summary")
@lru_cache(maxsize=128)
def get_kpi_summary(branch_code: str = "ALL", period: str = "ALL", start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    data = {"total_deposits": 0, "total_loans": 0, "total_npa": 0, "branches_reporting": 0}

    try:
        where_dep, params_dep = get_fact_date_filter_sql(period, "fact_deposit_master_daily", start_date=start_date, end_date=end_date)
        if branch_code != "ALL":
            where_dep += " AND branch_code = ?" if "WHERE" in where_dep else " WHERE branch_code = ?"
            params_dep.append(branch_code)

        cursor.execute(f"SELECT SUM(current_balance) FROM fact_deposit_master_daily {where_dep}", params_dep)
        result = cursor.fetchone()
        if result and result[0] is not None:
            data["total_deposits"] = float(result[0])

        where_loan, params_loan = get_fact_date_filter_sql(period, "fact_loan_master_daily", start_date=start_date, end_date=end_date)
        if branch_code != "ALL":
            where_loan += " AND branch_code = ?" if "WHERE" in where_loan else " WHERE branch_code = ?"
            params_loan.append(branch_code)

        cursor.execute(f"SELECT SUM(outstanding_balance) FROM fact_loan_master_daily {where_loan}", params_loan)
        result = cursor.fetchone()
        if result and result[0] is not None:
            data["total_loans"] = float(result[0])

        where_npa, params_npa = get_fact_date_filter_sql(period, "fact_npa_rbi_master", "WHERE", start_date=start_date, end_date=end_date)
        if branch_code != "ALL":
            where_npa += " AND branch_code = ?" if "WHERE" in where_npa else " WHERE branch_code = ?"
            params_npa.append(branch_code)

        cursor.execute(f"SELECT SUM(gross_npa_amount) FROM fact_npa_rbi_master {where_npa}", params_npa)
        result = cursor.fetchone()
        if result and result[0] is not None:
            data["total_npa"] = float(result[0])

        if branch_code == "ALL":
            where_br, params_br = get_fact_date_filter_sql(period, "fact_deposit_master_daily")
            cursor.execute(f"SELECT COUNT(DISTINCT branch_code) FROM fact_deposit_master_daily {where_br}", params_br)
            result = cursor.fetchone()
            if result and result[0] is not None:
                data["branches_reporting"] = int(result[0])
        else:
            data["branches_reporting"] = 1
    except Exception as e:
        print(f"Error calculating KPIs: {e}")
    finally:
        conn.close()
    return data"""
content = re.sub(r'@app\.get\("/api/kpi-summary"\).*?return data', new_kpi, content, flags=re.DOTALL)

# 3. Replace get_deposit_branch_wise
new_deposit = """@app.get("/api/deposit-branch-wise")
@lru_cache(maxsize=128)
def get_deposit_branch_wise(branch_code: str = "ALL", period: str = "ALL", start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_dep, params_dep = get_fact_date_filter_sql(period, "fact_deposit_master_daily", start_date=start_date, end_date=end_date)
        if branch_code != "ALL":
            where_dep += " AND fact_deposit_master_daily.branch_code = ?" if "WHERE" in where_dep else " WHERE fact_deposit_master_daily.branch_code = ?"
            params_dep.append(branch_code)

        query = f\"\"\"
            SELECT TOP 10 fact_deposit_master_daily.branch_code, dim_branch_hierarchy.branch_name, SUM(fact_deposit_master_daily.current_balance) AS TOTAL_DEPOSITS, COUNT(*) AS ACCOUNT_COUNT
            FROM fact_deposit_master_daily
            LEFT JOIN dim_branch_hierarchy ON fact_deposit_master_daily.branch_code = dim_branch_hierarchy.branch_code
            {where_dep}
            GROUP BY fact_deposit_master_daily.branch_code, dim_branch_hierarchy.branch_name
            ORDER BY TOTAL_DEPOSITS DESC
        \"\"\"
        cursor.execute(query, params_dep)
        rows = cursor.fetchall()
        data = []
        for row in rows:
            data.append({
                "branch_code": str(row[0]).strip() if row[0] else "",
                "name": str(row[1]).strip() if row[1] else "Unknown",
                "value": float(row[2]) if row[2] else 0.0,
                "account_count": int(row[3]) if row[3] else 0,
            })
        return data
    except Exception as e:
        print(f"Error calculating branch-wise deposits: {e}")
        return []
    finally:
        conn.close()"""
content = re.sub(r'@app\.get\("/api/deposit-branch-wise"\).*?return \[\]\n\n    finally:\n        conn\.close\(\)', new_deposit, content, flags=re.DOTALL)

with open('api.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Migration of KPI and branch endpoints successful.")
