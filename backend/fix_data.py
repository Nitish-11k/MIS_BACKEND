import pyodbc
from app.api import get_db_connection

def fix_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    print("Fixing dim_branch_hierarchy...")
    cursor.execute("DELETE FROM dim_branch_hierarchy")
    cursor.execute("""
        INSERT INTO dim_branch_hierarchy (branch_code, branch_name, region_name, zone_name)
        SELECT DISTINCT BRANCH_CODE, BRANCH_NAME, REGIONAL_OFFICE, HEAD_OFFICE 
        FROM BRANCH_NETWORK 
        WHERE BRANCH_CODE IS NOT NULL
    """)
    conn.commit()
    print("dim_branch_hierarchy fixed.")

    print("Fixing fact_loan_master_daily CIF...")
    cursor.execute("""
        UPDATE F SET cif_number = L.CUSTOMER
        FROM fact_loan_master_daily F
        INNER JOIN BAL_IN_LOAN_ACC_GLCC_WISE_DET L ON F.account_no = L.ACCOUNT
        WHERE F.cif_number IS NULL
    """)
    conn.commit()

    print("Fixing fact_deposit_master_daily CIF from Member Report...")
    # Many-to-many might fail in SQL Server UPDATE FROM without distinct, so use CTE
    cursor.execute("""
        WITH DistinctMembers AS (
            SELECT NAME_OF_CUSTOMER, MAX(CUSTOMER_NUMBER) as CUSTOMER_NUMBER 
            FROM CUSTOMER_MEMBER_REPORT 
            GROUP BY NAME_OF_CUSTOMER
        )
        UPDATE F SET cif_number = M.CUSTOMER_NUMBER
        FROM fact_deposit_master_daily F
        INNER JOIN DistinctMembers M ON F.customer_name = M.NAME_OF_CUSTOMER
        WHERE F.cif_number IS NULL
    """)
    conn.commit()

    print("Fixing fact_deposit_master_daily CIF from Loan Table...")
    cursor.execute("""
        WITH DistinctLoans AS (
            SELECT NAME_OF_ACCOUNT, MAX(CUSTOMER) as CUSTOMER 
            FROM BAL_IN_LOAN_ACC_GLCC_WISE_DET 
            GROUP BY NAME_OF_ACCOUNT
        )
        UPDATE F SET cif_number = L.CUSTOMER
        FROM fact_deposit_master_daily F
        INNER JOIN DistinctLoans L ON F.customer_name = L.NAME_OF_ACCOUNT
        WHERE F.cif_number IS NULL
    """)
    conn.commit()

    print("Data fixes applied successfully.")

if __name__ == "__main__":
    fix_data()
