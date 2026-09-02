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
            
        if set(stripped) <= {'-', '_', '=', ' ', '<', '>', '|'}:
            dash_count += 1
            if dash_count >= 2:
                data_started = True
            continue
            
        if not data_started:
            continue
            
        if "NIL REPORT" in stripped:
            continue
            
        if any(ord(c) < 32 and c not in '\t' for c in stripped):
            continue

        if len(stripped) < 10:
            continue

        row = {
            "SR_NO": line[0:15].strip(),
            "ACCOUNT_NO": line[15:27].strip(),
            "ACCOUNT_NAME": line[27:54].strip(),
            "FACILITY": line[54:84].strip(),
            "LIMIT": line[84:99].strip(),
            "OUTSTANDING": line[99:112].strip(),
            "RISK_GRADE": line[112:123].strip(),
            "HOME_BRCH": line[123:137].strip(),
            "OFFICE_PHONE": line[137:153].strip(),
            "HOME_PHONE": line[153:168].strip(),
            "REMARKS": line[168:].strip(),
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", "")
        }
        
        if row["SR_NO"] or row["ACCOUNT_NO"]:
            rows.append(row)

    if not rows:
        rows.append({
            "SR_NO": "", "ACCOUNT_NO": "", "ACCOUNT_NAME": "", 
            "FACILITY": "", "LIMIT": "", "OUTSTANDING": "", 
            "RISK_GRADE": "", "HOME_BRCH": "", "OFFICE_PHONE": "", 
            "HOME_PHONE": "", "REMARKS": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
