import re

with open('api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace get_exceptions
new_exc = """@app.get("/api/exceptions")
def get_exceptions():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(\"\"\"
        SELECT TOP 10 account_no, breach_amount as amount, '-' as customer_name, exception_description as error_desc, 0 as outstanding
        FROM fact_ews_audit_exceptions
    \"\"\")
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
    return data"""
content = re.sub(r'@app\.get\("/api/exceptions"\).*?return data', new_exc, content, flags=re.DOTALL)

with open('api.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Migration of exceptions endpoint successful.")
