from app.api import get_db_connection

def main():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check total count
    cursor.execute("SELECT COUNT(*) FROM BRANCH_NETWORK")
    total = cursor.fetchone()[0]
    
    print(f"Total branches in BRANCH_NETWORK: {total}")
    
    cursor.execute("SELECT ID, BRANCH_NAME, BRANCH_CODE, REGIONAL_OFFICE FROM BRANCH_NETWORK WHERE BRANCH_CODE IS NULL")
    null_codes = cursor.fetchall()
    
    if null_codes:
        print("\nBranches with NULL BRANCH_CODE (Likely extras):")
        for r in null_codes:
            print(r)
            
    # Find duplicates by BRANCH_CODE
    cursor.execute("""
        SELECT BRANCH_CODE, COUNT(*) 
        FROM BRANCH_NETWORK 
        WHERE BRANCH_CODE IS NOT NULL 
        GROUP BY BRANCH_CODE 
        HAVING COUNT(*) > 1
    """)
    dups = cursor.fetchall()
    if dups:
        print("\nDuplicate BRANCH_CODEs:")
        for r in dups:
            print(r)
            
if __name__ == '__main__':
    main()
