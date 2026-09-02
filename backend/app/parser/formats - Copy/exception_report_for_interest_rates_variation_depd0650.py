from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    data_started = False
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '_'}:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if "ACCOUNT" in stripped and "CUSTOMER NAME" in stripped:
            continue
            
        if "NUMBER" in stripped and "AMOUNT" in stripped:
            continue
            
        row = {
            "ACCOUNT_NUMBER": line[5:20].strip(),
            "CUSTOMER_NAME": line[20:70].strip(),
            "SANCTION_AMOUNT": line[70:85].strip(),
            "ACCT_TYPE": line[85:92].strip(),
            "SUB_TYPE": line[92:100].strip(),
            "PRODUCT_INT_RATE": line[100:112].strip(),
            "EFFECTIVE_INT_RATE": line[112:].strip(),
        }
        
        # skip empty rows
        if not row['ACCOUNT_NUMBER'].strip() and not row['CUSTOMER_NAME'].strip():
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "ACCOUNT_NUMBER": "",
            "CUSTOMER_NAME": "",
            "SANCTION_AMOUNT": "",
            "ACCT_TYPE": "",
            "SUB_TYPE": "",
            "PRODUCT_INT_RATE": "",
            "EFFECTIVE_INT_RATE": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
