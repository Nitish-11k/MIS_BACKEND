from app.api import get_db_connection
import re

def normalize_name(name):
    if not name: return ""
    name = re.sub(r'[^a-zA-Z0-9]', '', name).upper()
    return name

def main():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get Branches from actual bank data
    cursor.execute("SELECT DISTINCT BRANCH_CODE, BRANCH_NAME FROM LOANSBALANCEFILE_LOND2390 WHERE BRANCH_NAME IS NOT NULL")
    bank_branches = cursor.fetchall()
    bank_dict = {normalize_name(name): (code, name) for code, name in bank_branches if name}
    
    # Get Branches from BRANCH_NETWORK
    cursor.execute("SELECT ID, BRANCH_NAME FROM BRANCH_NETWORK")
    network_branches = cursor.fetchall()
    
    manual_map = {
        'Ambgharota': ('00004', 'AMBH GAROTTA'),
        'Bari Brahmna': ('00009', 'BARI BRAHMANA'),
        'Chenani': ('00020', 'CHINANI'),
        'Dansal': ('00022', 'DHANSAL'),
        'Dharal': ('00021', 'DARHAL'),
        'Ghambir Brahmna': ('00033', 'GHAMBIR BRAHMANA'),
        'Ghari': ('00035', 'Garhi'),
        'Gurah Kalyal': ('00036', 'GURA KALYAL'),
        'Khara Bhellessa': ('00044', 'KAHARA'),
        'Koteronka': ('00052', 'KOTRANKA BRANCH'),
        'Ph.Mandal': ('00063', 'PHALLAN MANDAL'),
        'R.S. Pura': ('00070', 'RANBIRSINGH PURA'),
        'HEAD OFFICE': ('00001', 'HEAD OFFICE')
    }
    
    matched_codes = set()
    
    # 1. Update existing matches
    for bid, name in network_branches:
        norm_name = normalize_name(name)
        code = None
        official_name = None
        
        # Check manual map
        if name in manual_map:
            code, official_name = manual_map[name]
        elif norm_name in bank_dict:
            code, official_name = bank_dict[norm_name]
        else:
            # Partial match
            for b_norm, (b_code, b_name) in bank_dict.items():
                if norm_name in b_norm or b_norm in norm_name:
                    code, official_name = b_code, b_name
                    break
                    
        if code:
            cursor.execute("UPDATE BRANCH_NETWORK SET BRANCH_CODE=?, BRANCH_NAME=? WHERE ID=?", (code, official_name, bid))
            matched_codes.add(code)
            
    conn.commit()
    print("Updated existing branches with codes.")
    
    # 2. Insert missing branches
    missing_inserted = 0
    for code, name in bank_branches:
        if code not in matched_codes:
            # Insert into BRANCH_NETWORK as Unassigned
            cursor.execute("INSERT INTO BRANCH_NETWORK (BRANCH_CODE, BRANCH_NAME, REGIONAL_OFFICE, DISTRICT, ADDRESS) VALUES (?, ?, ?, ?, ?)", 
                           (code, name, 'Unassigned', 'Unassigned', 'Data imported from bank DB'))
            missing_inserted += 1
            
    conn.commit()
    print(f"Inserted {missing_inserted} missing branches from DB into BRANCH_NETWORK.")
    conn.close()

if __name__ == '__main__':
    main()
