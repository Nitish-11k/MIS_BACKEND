import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)
    
    rows = []
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '=', '<', '>', '|'}:
            continue
            
        if "TOTAL:" in stripped:
            continue
            
        if any(kw in stripped.upper() for kw in ['REPORT ID', 'BRANCH CODE', 'PAGE NO', 'DATE', 'SR.NO']):
            continue
            
        # Match pattern: SR.NO, OTHER-BRANCH-CODE, CUSTOMER NAME, ACCOUNT NUMBER, PRODUCT NAME, TXN-CODE, amounts, MAKER ID
        m = re.match(r'^\s*(\d+)\s+(\d+)\s+(.*?)\s+(\d{11,16})\s+([\w-]+)\s+(\d+)\s*(.*?)\s+(\d*)\s*$', stripped)
        
        row = {}
        if m:
            sr, obc, cust, acc, prod, txn, amounts_str, maker = m.groups()
            amounts = re.findall(r'[\d,]+\.\d{2}', amounts_str)
            debit = amounts[0] if len(amounts) > 0 and line.find(amounts[0]) < 185 else ''
            credit = amounts[0] if len(amounts) == 1 and line.find(amounts[0]) >= 185 else (amounts[1] if len(amounts) > 1 else '')
            
            row['SR_NO'] = sr
            row['OTHER_BRANCH_CODE'] = obc
            row['CUSTOMER_NAME'] = cust.strip()
            row['ACCOUNT_NUMBER'] = acc
            row['PRODUCT_NAME'] = prod
            row['TXN_CODE'] = txn
            row['TXN_DEBIT_AMOUNT'] = debit
            row['TXN_CREDIT_AMOUNT'] = credit
            row['MAKER_ID'] = maker
            
        if 'ACCOUNT_NUMBER' in row:
            row["REPORT_ID"] = metadata.get("REPORT_ID", "")
            row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
            row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
            row["PROC_DATE"] = metadata.get("PROC_DATE", "")
            rows.append(row)
            
    if not rows:
        rows.append({
            "SR_NO": "", "OTHER_BRANCH_CODE": "", "CUSTOMER_NAME": "",
            "ACCOUNT_NUMBER": "", "PRODUCT_NAME": "", "TXN_CODE": "",
            "TXN_DEBIT_AMOUNT": "", "TXN_CREDIT_AMOUNT": "", "MAKER_ID": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
