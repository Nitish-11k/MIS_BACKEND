from app.api import get_db_connection

def main():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Delete rows with NULL BRANCH_CODE
    cursor.execute("DELETE FROM BRANCH_NETWORK WHERE BRANCH_CODE IS NULL")
    deleted_nulls = cursor.rowcount
    print(f"Deleted {deleted_nulls} branches with NULL BRANCH_CODE.")
    
    # 2. Delete duplicates, keeping the one with the lowest ID
    cursor.execute("""
        WITH CTE AS (
            SELECT 
                ID,
                BRANCH_CODE,
                ROW_NUMBER() OVER(PARTITION BY BRANCH_CODE ORDER BY ID) as RowNum
            FROM BRANCH_NETWORK
            WHERE BRANCH_CODE IS NOT NULL
        )
        DELETE FROM BRANCH_NETWORK
        WHERE ID IN (SELECT ID FROM CTE WHERE RowNum > 1)
    """)
    deleted_dups = cursor.rowcount
    print(f"Deleted {deleted_dups} duplicate branches.")
    
    conn.commit()
    
    # Verify final count
    cursor.execute("SELECT COUNT(*) FROM BRANCH_NETWORK")
    total = cursor.fetchone()[0]
    print(f"Final total branches in BRANCH_NETWORK: {total}")
    
    conn.close()

if __name__ == '__main__':
    main()
