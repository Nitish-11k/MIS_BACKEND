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
            "SL_NO": line[0:15].strip(),
            "ID": line[15:30].strip(),
            "NO_OF_TXNS_DEBIT": line[30:50].strip(),
            "NO_OF_TXNS_CREDIT": line[50:61].strip(),
            "MEMO_HITS": line[61:].strip(),
        }
        
        # skip lines that are obviously just leftover headers or empty
        if not row['SL_NO'].strip() or row['SL_NO'].startswith('NIL REPORT') or "TOTAL" in row['SL_NO'].upper():
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "SL_NO": "",
            "ID": "",
            "NO_OF_TXNS_DEBIT": "",
            "NO_OF_TXNS_CREDIT": "",
            "MEMO_HITS": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
