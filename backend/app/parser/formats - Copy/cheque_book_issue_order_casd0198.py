import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)
    
    rows = []
    data_started = False
    
    # Regex to capture the fields with optional CHEQUE_NO_FROM, CHEQUE_NO_TO, and ISSUE_DATE
    regex = r'^\s*([\w-]+)\s+(.+?)(?:\s+(\d+)\s+(\d+))?\s+(\d{1,5})\s+(\d{2}/\d{2}/\d{4})\s*(?:\s+(\d{2}/\d{2}/\d{4}))?\s+([A-Za-z]+)\s+(\d+)\s*$'
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '='}:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        # Ignore headers and summary lines
        if "ACCOUNT NUMBER" in stripped or "CUSTOMER NAME" in stripped or "TELLER" in stripped:
            continue
            
        m = re.match(regex, line)
        if m:
            row = {
                "ACCOUNT_NUMBER": m.group(1) or "",
                "CUSTOMER_NAME": (m.group(2) or "").strip(),
                "CHEQUE_NO_FROM": m.group(3) or "",
                "CHEQUE_NO_TO": m.group(4) or "",
                "NO_OF_LEAVES": m.group(5) or "",
                "ORDER_DATE": m.group(6) or "",
                "ISSUE_DATE": m.group(7) or "",
                "STATUS": m.group(8) or "",
                "TELLER_NUMBER": m.group(9) or "",
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", "")
            }
            rows.append(row)
            
    if not rows:
        rows.append({
            "ACCOUNT_NUMBER": "", "CUSTOMER_NAME": "", "CHEQUE_NO_FROM": "",
            "CHEQUE_NO_TO": "", "NO_OF_LEAVES": "", "ORDER_DATE": "",
            "ISSUE_DATE": "", "STATUS": "", "TELLER_NUMBER": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
