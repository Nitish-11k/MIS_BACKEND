from app.api import get_db_connection
import json
import os

def export_branch_network():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT ID, BRANCH_NAME, REGIONAL_OFFICE, DISTRICT, ADDRESS, BRANCH_CODE FROM BRANCH_NETWORK")
    rows = cursor.fetchall()
    
    data = []
    for row in rows:
        data.append({
            "BRANCH_NAME": row[1],
            "REGIONAL_OFFICE": row[2],
            "DISTRICT": row[3],
            "ADDRESS": row[4],
            "BRANCH_CODE": row[5]
        })
        
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'branch_network_seed.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
        
    print(f"Exported {len(data)} branches to {out_path}")
    conn.close()

if __name__ == '__main__':
    export_branch_network()
