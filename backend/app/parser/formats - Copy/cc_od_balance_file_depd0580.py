from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    # Lines ko clean karein
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    
    for line in no_boiler:
        stripped = line.strip()
        
        # 1. Khali ya faltu lines ko skip karein
        if not stripped:
            continue
            
        # 2. Dash (---), Equals (===) ya headers ko skip karein
        if set(stripped) <= {'-', '_', '=', ' ', '<', '>', '|'}:
            continue
            
        # 3. Purane bache hue header text ko skip karein (Apni file ke hisaab se words add kar sakte hain)
        if "ACCOUNT NO" in stripped.upper() or "TOTAL" in stripped.upper() or "NIL REPORT" in stripped.upper() or "CUSTOMER" in stripped.upper():
            continue

        # 4. Data line check: Yahan hum check kar rahe hain ki line pipe se start ho (or just split it)
        if not stripped.startswith('|'):
            continue
            
        parts = line.split('|')
        if len(parts) < 17:
            continue

        row = {
            "ACCOUNT_NUM": parts[1].strip(),
            "ACCOUNT_TYP_DESC": parts[2].strip(),
            "CUSTOMER_NAME": parts[3].strip(),
            "RATE": parts[4].strip(),
            "LIMIT": parts[5].strip(),
            "DRAWING_POWER": parts[6].strip(),
            "LMT_EXPY_DT": parts[7].strip(),
            "ACCOUNT_BALANCE": parts[8].strip(),
            "UNCLEARED_BALANCE": parts[9].strip(),
            "IRREGULARITY": parts[10].strip(),
            "NEW": parts[11].strip(),
            "OLD": parts[12].strip(),
            "SANCTION_DT": parts[13].strip(),
            "ARREAR_COND": parts[14].strip(),
            "ACCT_MAINTAIN_BRANCH": parts[15].strip(),
            "STATUS": parts[16].strip(),
        }
        
        # Metadata attach karein
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    # Agar file me koi data nahi mila (khali file), toh database schema ke liye empty row bhejein
    if not rows:
        rows.append({
            "ACCOUNT_NUM": "",
            "ACCOUNT_TYP_DESC": "",
            "CUSTOMER_NAME": "",
            "RATE": "",
            "LIMIT": "",
            "DRAWING_POWER": "",
            "LMT_EXPY_DT": "",
            "ACCOUNT_BALANCE": "",
            "UNCLEARED_BALANCE": "",
            "IRREGULARITY": "",
            "NEW": "",
            "OLD": "",
            "SANCTION_DT": "",
            "ARREAR_COND": "",
            "ACCT_MAINTAIN_BRANCH": "",
            "STATUS": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows