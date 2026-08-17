from app.api import get_db_connection
import re

def normalize_name(name):
    if not name: return ""
    name = re.sub(r'[^a-zA-Z0-9]', '', name).upper()
    return name

def main():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Get Branches from actual bank data
    cursor.execute("SELECT DISTINCT BRANCH_CODE, BRANCH_NAME FROM LOANSBALANCEFILE_LOND2390 WHERE BRANCH_NAME IS NOT NULL")
    bank_branches = cursor.fetchall()
    
    # 2. Get Branches from BRANCH_NETWORK
    cursor.execute("SELECT ID, BRANCH_NAME FROM BRANCH_NETWORK")
    network_branches = cursor.fetchall()
    
    conn.close()
    
    bank_dict = {}
    for code, name in bank_branches:
        if name:
            norm_name = normalize_name(name)
            bank_dict[norm_name] = {'code': code, 'raw_name': name}
            
    net_dict = {}
    for bid, name in network_branches:
        if name:
            norm_name = normalize_name(name)
            net_dict[norm_name] = {'id': bid, 'raw_name': name}
            
    print(f"Total Unique Branches in Bank DB (LOANSBALANCEFILE): {len(bank_dict)}")
    print(f"Total Branches in BRANCH_NETWORK: {len(net_dict)}")
    
    matched = 0
    unmatched_in_network = []
    
    for norm_name, net_data in net_dict.items():
        if norm_name in bank_dict:
            matched += 1
        else:
            # Let's try partial matching
            found = False
            for bank_norm, bank_data in bank_dict.items():
                if norm_name in bank_norm or bank_norm in norm_name:
                    found = True
                    matched += 1
                    break
            if not found:
                unmatched_in_network.append(net_data['raw_name'])
            
    print(f"\nSuccessfully matched {matched} out of {len(net_dict)} branches from BRANCH_NETWORK.")
    
    if unmatched_in_network:
        print("\nBranches in BRANCH_NETWORK that DO NOT match anything in the Bank DB:")
        for b in sorted(unmatched_in_network):
            print(f"- {b}")
            
    # Branches in Bank DB not in Network
    unmatched_in_bank = []
    for bank_norm, bank_data in bank_dict.items():
        if bank_norm not in net_dict:
            found = False
            for net_norm, net_data in net_dict.items():
                if bank_norm in net_norm or net_norm in bank_norm:
                    found = True
                    break
            if not found:
                unmatched_in_bank.append(f"{bank_data['code']} - {bank_data['raw_name']}")
                
    if unmatched_in_bank:
        print("\nBranches in Bank DB that are MISSING from BRANCH_NETWORK:")
        for b in sorted(unmatched_in_bank):
            print(f"- {b}")

if __name__ == '__main__':
    main()
