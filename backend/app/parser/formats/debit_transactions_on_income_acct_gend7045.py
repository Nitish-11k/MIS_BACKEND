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
            "ACCOUNT_NO": line[0:19].strip(),
            "DATE": line[19:33].strip(),
            "TXN_AMOUNT": line[33:49].strip(),
            "DESCRIPTION": line[49:95].strip(),
            "MAKER_ID": line[95:107].strip(),
            "CHECKER_ID": line[107:].strip(),
        }
        
        # skip lines that are obviously just leftover headers or empty
        if not row['ACCOUNT_NO'].strip() or row['ACCOUNT_NO'].startswith('NIL REPORT') or "TOTAL" in row['ACCOUNT_NO'].upper():
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "ACCOUNT_NO": "",
            "DATE": "",
            "TXN_AMOUNT": "",
            "DESCRIPTION": "",
            "MAKER_ID": "",
            "CHECKER_ID": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
