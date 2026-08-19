"""
SQL Script Executor — Runs the data warehouse DDL/ETL scripts
against MIS_DATABASE using the same pyodbc connection as the backend.
"""
import pyodbc
import os
import sys

CONN_STR = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=DESKTOP-CNDH3DO\\MSSQLSERVER01;"
    "DATABASE=MIS_DATABASE;"
    "Trusted_Connection=yes;"
    "TrustServerCertificate=yes;"
)

SQL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sql')

SCRIPTS = [
    "00_create_schema.sql",
    "01_normalization_functions.sql",
    "02_dim_branch_hierarchy.sql",
    "03_fact_account_snapshot.sql",
    "04_fact_loan_risk_delinquency.sql",
    "05_fact_gl_product_summary.sql",
    "06_fact_audit_exceptions.sql",
    "07_etl_procedures.sql",
    "08_rls_security.sql",
    "09_dashboard_queries.sql",
]

def execute_sql_file(conn, filepath):
    """Execute a SQL file, splitting on GO statements."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split on GO statements (must be on their own line)
    import re
    batches = re.split(r'^\s*GO\s*$', content, flags=re.MULTILINE | re.IGNORECASE)
    
    cursor = conn.cursor()
    batch_count = 0
    for batch in batches:
        batch = batch.strip()
        if not batch:
            continue
        try:
            cursor.execute(batch)
            conn.commit()
            batch_count += 1
        except pyodbc.Error as e:
            error_msg = str(e)
            # Skip non-critical errors (like "already exists" warnings)
            if 'already exists' in error_msg.lower():
                print(f"   [WARN] {error_msg[:120]}")
                conn.commit()
                batch_count += 1
            else:
                print(f"   [ERROR] Batch {batch_count + 1}: {error_msg[:200]}")
                print(f"   SQL snippet: {batch[:100]}...")
                conn.rollback()
                raise
    
    cursor.close()
    return batch_count

def main():
    # Allow running a specific script by name
    target_scripts = SCRIPTS
    if len(sys.argv) > 1:
        target_scripts = [s for s in SCRIPTS if sys.argv[1] in s]
        if not target_scripts:
            print(f"No matching script found for: {sys.argv[1]}")
            return

    print("=" * 60)
    print("  Banking MIS Data Warehouse — Script Executor")
    print("=" * 60)
    print(f"  Connection: DESKTOP-CNDH3DO\\MSSQLSERVER01 / MIS_DATABASE")
    print(f"  Scripts dir: {SQL_DIR}")
    print()

    try:
        conn = pyodbc.connect(CONN_STR, autocommit=False)
        print("[OK] Connected to MIS_DATABASE.\n")
    except pyodbc.Error as e:
        print(f"[FAIL] Cannot connect: {e}")
        return

    results = []
    for script in target_scripts:
        filepath = os.path.join(SQL_DIR, script)
        if not os.path.exists(filepath):
            print(f"[SKIP] {script} — file not found.")
            results.append((script, 'SKIP'))
            continue

        print(f"[RUN]  {script} ...", end=" ", flush=True)
        try:
            batch_count = execute_sql_file(conn, filepath)
            print(f"OK ({batch_count} batches)")
            results.append((script, 'OK'))
        except Exception as e:
            print(f"FAILED")
            print(f"       {str(e)[:200]}")
            results.append((script, 'FAILED'))
            # Continue to next script
            try:
                conn.rollback()
            except:
                pass

    conn.close()

    print()
    print("=" * 60)
    print("  EXECUTION SUMMARY")
    print("=" * 60)
    for script, status in results:
        icon = "[OK]" if status == 'OK' else ("[--]" if status == 'SKIP' else "[!!]")
        print(f"  {icon}  {script}: {status}")
    print()

    failed = sum(1 for _, s in results if s == 'FAILED')
    if failed:
        print(f"  {failed} script(s) failed. Review errors above.")
    else:
        print("  All scripts executed successfully!")

if __name__ == '__main__':
    main()
