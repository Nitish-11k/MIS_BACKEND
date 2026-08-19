import pyodbc
from app.api import get_db_connection

def build_account_master():
    conn = get_db_connection()
    cursor = conn.cursor()

    print("Creating dim_account_master table...")
    cursor.execute("""
        IF EXISTS (SELECT * FROM sysobjects WHERE name='dim_account_master' and xtype='U')
            DROP TABLE dim_account_master;
            
        CREATE TABLE dim_account_master (
            account_no VARCHAR(100) PRIMARY KEY,
            cif_number VARCHAR(100),
            customer_name VARCHAR(255),
            branch_code VARCHAR(50),
            account_category VARCHAR(50), -- TERM LOAN, CC/OD, DEPOSIT
            scheme_code VARCHAR(100),
            joint_hold_flag VARCHAR(10),
            snapshot_date DATE
        );
    """)
    conn.commit()

    print("Inserting TERM LOANS...")
    cursor.execute("""
        INSERT INTO dim_account_master (account_no, cif_number, customer_name, branch_code, account_category, scheme_code, joint_hold_flag, snapshot_date)
        SELECT account_no, MAX(cif_number), MAX(customer_name), MAX(branch_code), 'TERM LOAN', MAX(scheme_code), 'Unknown', MAX(snapshot_date)
        FROM fact_loan_master_daily
        WHERE scheme_code NOT LIKE '%Cash Credit%' AND scheme_code NOT LIKE '%CC %' AND scheme_code NOT LIKE '%Over Draft%' AND scheme_code NOT LIKE '%OD %'
        GROUP BY account_no
    """)
    conn.commit()

    print("Inserting CC/OD...")
    cursor.execute("""
        INSERT INTO dim_account_master (account_no, cif_number, customer_name, branch_code, account_category, scheme_code, joint_hold_flag, snapshot_date)
        SELECT account_no, MAX(cif_number), MAX(customer_name), MAX(branch_code), 'CC/OD', MAX(scheme_code), 'Unknown', MAX(snapshot_date)
        FROM fact_loan_master_daily
        WHERE scheme_code LIKE '%Cash Credit%' OR scheme_code LIKE '%CC %' OR scheme_code LIKE '%Over Draft%' OR scheme_code LIKE '%OD %'
        GROUP BY account_no
    """)
    conn.commit()

    print("Inserting DEPOSITS...")
    # DEPOSITS_BALANCE_FILE_DEPD0586 has JOINT_HOLD_FLAG
    cursor.execute("""
        INSERT INTO dim_account_master (account_no, cif_number, customer_name, branch_code, account_category, scheme_code, joint_hold_flag, snapshot_date)
        SELECT 
            D.deposit_account_no, 
            MAX(D.cif_number), 
            MAX(D.customer_name), 
            MAX(D.branch_code), 
            'DEPOSIT', 
            MAX(D.deposit_type), 
            MAX(ISNULL(R.JOINT_HOLD_FLAG, 'N')),
            MAX(D.snapshot_date)
        FROM fact_deposit_master_daily D
        LEFT JOIN DEPOSITS_BALANCE_FILE_DEPD0586 R ON D.deposit_account_no = R.ACCOUNT_NUMBER
        WHERE D.deposit_account_no NOT IN (SELECT account_no FROM dim_account_master)
        GROUP BY D.deposit_account_no
    """)
    conn.commit()

    # Create Index for performance
    cursor.execute("CREATE NONCLUSTERED INDEX idx_dim_account_cat ON dim_account_master(account_category);")
    conn.commit()
    
    print("dim_account_master built successfully!")

if __name__ == "__main__":
    build_account_master()
