import traceback
try:
    from app.api import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('TRUNCATE TABLE fact_ews_audit_exceptions')
    cursor.execute('TRUNCATE TABLE fact_npa_rbi_master')
    cursor.execute('TRUNCATE TABLE fact_loan_master_daily')
    cursor.execute('TRUNCATE TABLE fact_deposit_master_daily')
    cursor.execute('TRUNCATE TABLE dim_branch_hierarchy')
    cursor.execute('TRUNCATE TABLE dim_customer_cif')
    cursor.execute('TRUNCATE TABLE dim_loan_scheme')
    conn.commit()
    print("TRUNCATE SUCCESS")
    
    import etl_master_tables
    etl_master_tables.run_etl()
    print("ETL SUCCESS")
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
