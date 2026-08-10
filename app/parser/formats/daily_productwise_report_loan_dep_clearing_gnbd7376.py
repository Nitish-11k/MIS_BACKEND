import re
from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    current_prod_code = ""
    current_prod_desc = ""
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Extract Prod Code and Desc
        if "PROD CODE" in stripped and "PROD DESC" in stripped:
            m = re.search(r'PROD CODE\s*:\s*(.*?)\s*PROD DESC\s*:\s*(.*)', stripped)
            if m:
                current_prod_code = m.group(1).strip()
                current_prod_desc = m.group(2).strip()
            continue
            
        # Ignore structural and header lines
        if set(stripped) <= {'-', '_'}:
            continue
        if "ACCOUNT NO'S" in stripped or "S.NO." in stripped or "TOTALS FOR PRODUCT" in stripped:
            continue
            
        # Process data rows
        if '|' in line:
            parts = line.split('|')
            if len(parts) >= 10:
                row = {
                    "S_NO": parts[0].strip(),
                    "ACCOUNT_NO": parts[1].strip(),
                    "CASH_CREDIT": parts[2].strip(),
                    "CASH_DEBIT": parts[3].strip(),
                    "CLEARING_CREDIT": parts[4].strip(),
                    "CLEARING_DEBIT": parts[5].strip(),
                    "TRANSFER_CREDIT": parts[6].strip(),
                    "TRANSFER_DEBIT": parts[7].strip(),
                    "PRODUCT_TOTAL_CREDIT": parts[8].strip(),
                    "PRODUCT_TOTAL_DEBIT": parts[9].strip(),
                    "PROD_CODE": current_prod_code,
                    "PROD_DESC": current_prod_desc,
                    "REPORT_ID": metadata.get("REPORT_ID", ""),
                    "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                    "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                    "PROC_DATE": metadata.get("PROC_DATE", "")
                }
                
                if row['S_NO'] or row['ACCOUNT_NO']:  # Only append non-empty rows
                    rows.append(row)

    if not rows:
        rows.append({
            "S_NO": "",
            "ACCOUNT_NO": "",
            "CASH_CREDIT": "",
            "CASH_DEBIT": "",
            "CLEARING_CREDIT": "",
            "CLEARING_DEBIT": "",
            "TRANSFER_CREDIT": "",
            "TRANSFER_DEBIT": "",
            "PRODUCT_TOTAL_CREDIT": "",
            "PRODUCT_TOTAL_DEBIT": "",
            "PROD_CODE": "",
            "PROD_DESC": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
