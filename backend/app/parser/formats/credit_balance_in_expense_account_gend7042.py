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
            
        row = {
            "ACCOUNT_NUMBER": line[0:18].strip(),
            "DESCRIPTION": line[19:64].strip(),
            "TXN_AMOUNT": line[65:88].strip(),
            "BALANCE": line[89:].strip(),
        }
        
        # skip lines that are obviously just leftover headers or empty
        if not row['ACCOUNT_NUMBER'].strip() or row['ACCOUNT_NUMBER'].startswith('NIL REPORT') or "TOTAL" in row['ACCOUNT_NUMBER'].upper():
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "ACCOUNT_NUMBER": "",
            "DESCRIPTION": "",
            "TXN_AMOUNT": "",
            "BALANCE": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
