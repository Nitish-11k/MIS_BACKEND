import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)
    
    rows = []
    data_started = False
    
    # Regex for GL Outstanding Accnts data row
    regex = r'^\s*([\w-]+)\s+(.+?)\s+(\d{2}-\d{2}-\d{4})\s+(\d{2}-\d{2}-\d{4})\s+([A-Z0-9]+)\s+([A-Z0-9]+)\s+([-\d.,]+\s*(?:CR|DR)?)\s+([A-Z0-9]{3})\s*$'
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '='}:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        # Ignore totals
        if "ACCOUNT TOTAL" in stripped or "BRANCH TOTAL" in stripped:
            continue
            
        if "ACCOUNT.NO" in stripped and "ACCT.PERTICULARS" in stripped:
            continue
            
        m = re.match(regex, line)
        if m:
            row = {
                "ACCOUNT_NO": m.group(1),
                "ACCT_PARTICULARS": m.group(2).strip(),
                "ISSUE_DATE": m.group(3),
                "VALUE_DATE": m.group(4),
                "REF_NUMBER": m.group(5),
                "TRAN_NO": m.group(6),
                "AMOUNT": m.group(7).strip(),
                "REM": m.group(8),
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", "")
            }
            rows.append(row)
            
    if not rows:
        rows.append({
            "ACCOUNT_NO": "", "ACCT_PARTICULARS": "", "ISSUE_DATE": "",
            "VALUE_DATE": "", "REF_NUMBER": "", "TRAN_NO": "",
            "AMOUNT": "", "REM": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
