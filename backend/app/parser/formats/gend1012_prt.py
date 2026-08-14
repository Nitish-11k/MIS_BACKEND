from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    data_started = False
    dash_count = 0
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '_'}:
            dash_count += 1
            if dash_count >= 2:
                data_started = True
            continue
            
        if not data_started:
            continue
            
        # Skip empty lines or leftover headers
        if not line.strip() or line.startswith('NIL REPORT') or "TOTAL" in line.upper() or "JRNL NO" in line.upper() or "SUM " in line.upper():
            continue
            
        row = {
            "JRNL_NO": line[0:11].strip(),
            "TXN_NO": line[11:17].strip(),
            "DESCRIPTION": line[17:48].strip(),
            "ACCOUNT_NO": line[48:62].strip(),
            "GLCC_CODE": line[62:82].strip(),
            "TXN_TIME": line[82:95].strip(),
            "AMOUNT": line[95:110].strip(),
            "AMOUNT_IN_TECH_CONT": line[110:].strip()
        }
        
        if "*Note:" in line or "For other enteries" in line or "Please confirm" in line:
            break
            
        if not row['JRNL_NO'] and not row['AMOUNT']:
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "JRNL_NO": "",
            "TXN_NO": "",
            "DESCRIPTION": "",
            "ACCOUNT_NO": "",
            "GLCC_CODE": "",
            "TXN_TIME": "",
            "AMOUNT": "",
            "AMOUNT_IN_TECH_CONT": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
