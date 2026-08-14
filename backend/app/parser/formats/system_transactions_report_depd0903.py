import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

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
            
        if set(stripped) <= {'-', '='} or stripped.startswith('---'):
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if "PRODUCT TOTAL" in line or "GRAND TOTAL" in line:
            continue
        if "REPORT ID" in line or "BRANCH NO" in line or "PAGE NO" in line or "SNO" in line:
            continue
            
        # Try to match the SNO pattern at the start to ensure it's a valid data row
        if not re.match(r'^\s*\d+\s+', line):
            continue

        row = {}
        if len(line) > 166:
            row["SNO"] = line[0:4].strip()
            row["ACCOUNT_TYPE"] = line[4:13].strip()
            row["INTEREST_CATEGORY"] = line[13:23].strip()
            row["PRODUCT_DESCRIPTION"] = line[23:55].strip()
            row["ACCOUNT_NUMBER"] = line[55:73].strip()
            row["CUSTOMER_NAME"] = line[73:109].strip()
            row["CREDIT_AMOUNT"] = line[109:130].strip()
            row["DEBIT_AMOUNT"] = line[130:150].strip()
            row["AVAILABLE_BALANCE"] = line[150:166].strip()
            row["TRANSACTION_NARRATION"] = line[166:].strip()
        else:
            continue
        
        if row.get("ACCOUNT_NUMBER"):
            row["REPORT_ID"] = metadata.get("REPORT_ID", "")
            row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
            row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
            row["PROC_DATE"] = metadata.get("PROC_DATE", "")
            rows.append(row)
            
    if not rows:
        rows.append({
            "SNO": "", "ACCOUNT_TYPE": "", "INTEREST_CATEGORY": "", 
            "PRODUCT_DESCRIPTION": "", "ACCOUNT_NUMBER": "", "CUSTOMER_NAME": "", 
            "CREDIT_AMOUNT": "", "DEBIT_AMOUNT": "", "AVAILABLE_BALANCE": "",
            "TRANSACTION_NARRATION": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
