import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)
    
    rows = []
    data_started = False
    current_product = ""
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '='}:
            data_started = True
            continue
            
        # Extract product description
        if "PRODUCT  DESCRIPTION  :" in line or "PRODUCT DESCRIPTION :" in line:
            parts = line.split(":")
            if len(parts) > 1:
                current_product = parts[1].strip()
            continue
            
        if not data_started:
            continue
            
        # Ignore PROD TOTAL rows as requested by user
        if "PROD TOTAL" in stripped.upper():
            continue
            
        # Ignore headers
        if "ACCOUNT NUMBER" in stripped and "CUSTOMER NAME" in stripped:
            continue
            
        # Valid data rows start with an account number (digits)
        m = re.match(r'^\s*(\d{10,16})', stripped)
        if m:
            row = {
                "ACCOUNT_NUMBER": line[0:21].strip(),
                "CUSTOMER_NAME": line[21:60].strip(),
                "TRANSACTION_DESCRIPTION": line[60:98].strip(),
                "TXN_DATE": line[98:114].strip(),
                "TRANSACTION_AMOUNT": line[114:140].strip(),
                "PRODUCT_NAME": current_product,
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", "")
            }
            rows.append(row)
            
    if not rows:
        rows.append({
            "ACCOUNT_NUMBER": "", "CUSTOMER_NAME": "", "TRANSACTION_DESCRIPTION": "",
            "TXN_DATE": "", "TRANSACTION_AMOUNT": "", "PRODUCT_NAME": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
