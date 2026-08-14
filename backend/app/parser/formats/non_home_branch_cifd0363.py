import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    
    # Fixed-width column positions based on the header line:
    # SR.NO  OTHER-BRANCH-CODE  CUSTOMER NAME ... ACCOUNT NUMBER  PRODUCT NAME ... TXN-CODE ... TXN-DEBIT-AMOUNT ... TXN-CREDIT-AMOUNT  MAKER ID  CHECKER ID
    col_defs = [
        ("SR_NO",             0,   6),
        ("OTHER_BRANCH_CODE", 7,  25),
        ("CUSTOMER_NAME",    26,  91),
        ("ACCOUNT_NUMBER",   92, 107),
        ("PRODUCT_NAME",    108, 139),
        ("TXN_CODE",        140, 157),
        ("TXN_DEBIT_AMOUNT",158, 182),
        ("TXN_CREDIT_AMOUNT",183,201),
        ("MAKER_ID",        202, 211),
        ("CHECKER_ID",      212, 999),
    ]
    
    rows = []
    current_branch_code = metadata.get("BRANCH_CODE", "")
    current_branch_name = metadata.get("BRANCH_NAME", "")
    
    for line in lines:
        stripped = line.strip()
        
        if not stripped:
            continue
            
        # Skip control chars
        if stripped.startswith('\x1b') or stripped.startswith('\x0c'):
            continue
        
        # Skip dash/separator lines
        if set(stripped) <= {'-', '=', '<', '>', '|', ' '}:
            continue
        
        # Skip header/boilerplate
        upper = stripped.upper()
        if any(kw in upper for kw in ['REPORT ID', 'AREA:', 'RUN DATE', 'PROC DATE', 'PAGE NO',
                                       'SR.NO', 'OTHER-BRANCH-CODE', 'TRANSACTIONS POSTED',
                                       '** END', 'GRAND TOTAL']):
            continue
            
        # Skip TOTAL lines
        if 'TOTAL:' in stripped:
            continue
        
        # Detect branch header lines: "BRANCH NO :     2   BRANCH NAME : ..."
        branch_match = re.match(r'BRANCH\s+NO\s*:\s*(\d+)\s+BRANCH\s+NAME\s*:\s*(.+?)(?:\s{3,}PAGE\s+NO|$)', stripped)
        if branch_match:
            current_branch_code = branch_match.group(1).strip().zfill(5)
            current_branch_name = branch_match.group(2).strip()
            continue
        
        # Try to extract a data row - must start with a number (SR.NO)
        sr_no = line[0:6].strip()
        if not sr_no or not sr_no.isdigit():
            continue
            
        row = {}
        for col_name, start, end in col_defs:
            actual_end = min(end, len(line))
            if start < len(line):
                val = line[start:actual_end].strip()
            else:
                val = ""
            row[col_name] = val
        
        # Only add if we got an account number
        if row.get("ACCOUNT_NUMBER"):
            row["REPORT_ID"] = metadata.get("REPORT_ID", "")
            row["BRANCH_CODE"] = current_branch_code
            row["BRANCH_NAME"] = current_branch_name
            row["PROC_DATE"] = metadata.get("PROC_DATE", "")
            rows.append(row)
            
    if not rows:
        rows.append({
            "SR_NO": "", "OTHER_BRANCH_CODE": "", "CUSTOMER_NAME": "",
            "ACCOUNT_NUMBER": "", "PRODUCT_NAME": "", "TXN_CODE": "",
            "TXN_DEBIT_AMOUNT": "", "TXN_CREDIT_AMOUNT": "", "MAKER_ID": "",
            "CHECKER_ID": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows

