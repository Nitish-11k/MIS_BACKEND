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
            "ACCOUNT_NUMBER": line[0:25].strip(),
            "ACCOUNT_TYPE": line[25:55].strip(),
            "CUSTOMER_NAME": line[55:122].strip(),
            "AVAILABLE_BALANCE": line[122:143].strip(),
            "UNCLEARED_BALANCE": line[143:165].strip(),
            "CURRENT_BALANCE": line[165:188].strip(),
            "LIMIT": line[188:210].strip(),
            "TERM": line[210:223].strip(),
            "INT_RATE": line[223:227].strip(),
            "STATUS": line[227:265].strip(),
            "JOINT_HOLD_FLAG": line[265:].strip(),
        }
        
        # INT_RATE and STATUS are often merged in the raw file at positions 223-253
        # e.g. "8.00     OPEN" - we need to split them
        raw_int_status = line[229:265].strip()
        if raw_int_status:
            parts = raw_int_status.split()
            if len(parts) >= 2:
                row["INT_RATE"] = parts[0]
                row["STATUS"] = parts[-1]
            elif len(parts) == 1:
                # Could be just a rate or just a status
                if "." in parts[0]:
                    row["INT_RATE"] = parts[0]
                elif parts[0].isdigit() and len(parts[0]) == 2:
                    row["STATUS"] = parts[0]
                else:
                    # If it's a single digit or something else without a dot, likely interest rate or garbage
                    row["INT_RATE"] = parts[0]
        
        # skip lines that are obviously just leftover headers or empty
        if not row['ACCOUNT_NUMBER'].strip() or row['ACCOUNT_NUMBER'].startswith('NIL REPORT') or "TOTAL" in row['ACCOUNT_NUMBER'].upper():
            continue
            
        if "ACCOUNT" in row['ACCOUNT_NUMBER'].upper() or row['ACCOUNT_NUMBER'].startswith('^'):
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "ACCOUNT_NUMBER": "",
            "ACCOUNT_TYPE": "",
            "CUSTOMER_NAME": "",
            "AVAILABLE_BALANCE": "",
            "UNCLEARED_BALANCE": "",
            "CURRENT_BALANCE": "",
            "LIMIT": "",
            "TERM": "",
            "INT_RATE": "",
            "STATUS": "",
            "JOINT_HOLD_FLAG": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
