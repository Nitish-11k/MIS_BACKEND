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
            "USER_ID": line[0:8].strip(),
            "USER_NAME": line[9:34].strip(),
            "USER_CAPABILITY_LEVEL": line[35:53].strip(),
            "DATA_SECURITY_LEVEL": line[54:70].strip(),
            "DATA_SECURITY_GROUP": line[71:88].strip(),
            "USER_STATUS": line[89:108].strip(),
            "DESIGNATION": line[109:128].strip(),
            "DIVISION": line[129:].strip(),
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
