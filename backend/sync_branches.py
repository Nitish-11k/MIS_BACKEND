from app.api import get_db_connection

def main():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Add BRANCH_CODE column if not exists
    try:
        cursor.execute("ALTER TABLE BRANCH_NETWORK ADD BRANCH_CODE VARCHAR(50)")
        conn.commit()
        print("Added BRANCH_CODE column.")
    except Exception as e:
        print("Column may already exist:", str(e))
        
    # Mapping of HTML name to Official (Code, Name)
    manual_map = {
        'Ambgharota': ('00004', 'AMBH GAROTTA'),
        'Bari Brahmna': ('00009', 'BARI BRAHMANA'),
        'Chenani': ('00020', 'CHINANI'),
        'Dansal': ('00022', 'DHANSAL'),
        'Dharal': ('00021', 'DARHAL'),
        'Ghambir Brahmna': ('00033', 'GHAMBIR BRAHMANA'),
        'Ghari': ('00035', 'Garhi'),
        'Ghat': (None, None), # Need to figure this out
        'Gurah Kalyal': ('00036', 'GURA KALYAL'),
        'Khara Bhellessa': ('00044', 'KAHARA'), # Assumption
        'Koteronka': ('00052', 'KOTRANKA BRANCH'),
        'Ph.Mandal': ('00063', 'PHALLAN MANDAL'),
        'R.S. Pura': ('00070', 'RANBIRSINGH PURA'),
        'Rehari': (None, None), # Need to figure this out
        'HEAD OFFICE': ('00001', 'HEAD OFFICE') # We added this manually earlier
    }
    
    # First, let's get ALL bank branches to double check
    cursor.execute("SELECT DISTINCT BRANCH_CODE, BRANCH_NAME FROM LOANSBALANCEFILE_LOND2390 WHERE BRANCH_NAME IS NOT NULL")
    bank_branches = cursor.fetchall()
    
    print("\n--- ALL BANK BRANCHES ---")
    for b in sorted([f"{row[0]} - {row[1]}" for row in bank_branches]):
        print(b)
        
if __name__ == '__main__':
    main()
