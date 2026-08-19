import re

with open('app/api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update /api/gl-summary
gl_summary_new = """@app.get("/api/gl-summary")
def get_gl_summary(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = "WHERE gl_name IS NOT NULL AND gl_name != ''"
    params = []
    if branch_code != "ALL":
        where_clause += " AND branch_code = ?"
        params.append(branch_code)
        
    cursor.execute(f\"\"\"
        SELECT TOP 6 gl_name, branch_code, SUM(cr_balance + dr_balance) as TotalVolume
        FROM fact_gl_balances_daily
        {where_clause}
        GROUP BY gl_name, branch_code
        ORDER BY TotalVolume DESC
    \"\"\", params)
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
    return data"""

content = re.sub(r'@app\.get\("/api/gl-summary"\).*?return data', gl_summary_new, content, flags=re.DOTALL)

# 2. Update /api/glcc-summary
glcc_summary_new = """@app.get("/api/glcc-summary")
def get_glcc_summary(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = "WHERE gl_name IS NOT NULL AND gl_name != ''"
    params = []
    if branch_code != "ALL":
        where_clause += " AND branch_code = ?"
        params.append(branch_code)
        
    cursor.execute(f\"\"\"
        SELECT TOP 8 gl_name, COUNT(*) as accounts, SUM(ABS(net_balance)) as amount
        FROM fact_gl_balances_daily
        {where_clause}
        GROUP BY gl_name
        ORDER BY amount DESC
    \"\"\", params)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "name": row[0][:25] if row[0] else "Unknown",
            "accounts": int(row[1]) if row[1] else 0,
            "amount": float(row[2]) if row[2] else 0
        })
    return data"""

content = re.sub(r'@app\.get\("/api/glcc-summary"\).*?return data', glcc_summary_new, content, flags=re.DOTALL)

# 3. Update /api/gl-daybook-summary
gl_daybook_new = """@app.get("/api/gl-daybook-summary")
def get_gl_daybook_summary(branch_code: str = "ALL"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    where_clause = "WHERE txn_type IS NOT NULL AND txn_type != ''"
    params = []
    if branch_code != "ALL":
        where_clause += " AND branch_code = ?"
        params.append(branch_code)
        
    cursor.execute(f\"\"\"
        SELECT TOP 6 txn_type, COUNT(*) as cnt, SUM(debit_amount) as total_debit
        FROM fact_gl_transactions_daily
        {where_clause}
        GROUP BY txn_type
        ORDER BY cnt DESC
    \"\"\", params)
    rows = cursor.fetchall()
    conn.close()
    
    data = []
    for row in rows:
        data.append({
            "name": row[0][:22] if row[0] else "Unknown",
            "count": row[1],
            "amount": float(row[2]) if row[2] else 0
        })
    return data"""

content = re.sub(r'@app\.get\("/api/gl-daybook-summary"\).*?return data', gl_daybook_new, content, flags=re.DOTALL)

with open('app/api.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Migrated GL endpoints to Master Fact Tables.")
