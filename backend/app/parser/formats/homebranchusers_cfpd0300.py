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
            
        parts = __import__('re').split(r'\s{2,}', line.strip())
        
        row = {
            "USER_ID": parts[0] if len(parts) > 0 else "",
            "USER_NAME": parts[1] if len(parts) > 1 else "",
            "USER_CAPABILITY_LEVEL": parts[2] if len(parts) > 2 else "",
            "DATA_SECURITY_LEVEL": parts[3] if len(parts) > 3 else "",
            "DATA_SECURITY_GROUP": parts[4] if len(parts) > 4 else "",
            "USER_STATUS": parts[5] if len(parts) > 5 else "",
            "DESIGNATION": parts[6] if len(parts) > 6 else "",
            "DIVISION": parts[7] if len(parts) > 7 else "",
        }
        
        # skip lines that are obviously just leftover headers or empty
        if not row['USER_ID'].strip() or row['USER_ID'].startswith('NIL REPORT') or "TOTAL" in row['USER_ID'].upper():
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "USER_ID": "",
            "USER_NAME": "",
            "USER_CAPABILITY_LEVEL": "",
            "DATA_SECURITY_LEVEL": "",
            "DATA_SECURITY_GROUP": "",
            "USER_STATUS": "",
            "DESIGNATION": "",
            "DIVISION": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
