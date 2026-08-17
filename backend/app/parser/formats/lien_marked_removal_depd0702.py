import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)
    
    rows = []
    data_started = False
    
    # Regex for Lien Marked Removal data row
    regex = r'^\s*(\d+)\s+([\w-]+)\s+(.+?)\s{2,}([-\d.,]+)\s{2,}(.+?)\s{2,}(MARK|REM|MARK/REM)\s+(\w+)\s+(\w+)\s*$'
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '='}:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if "SR-NO" in stripped and "ACCOUNT-NO" in stripped:
            continue
            
        m = re.match(regex, line)
        if m:
            row = {
                "SR_NO": m.group(1),
                "ACCOUNT_NO": m.group(2),
                "TYPE_OF_ACCOUNT": m.group(3).strip(),
                "LIEN_AMOUNT": m.group(4).strip(),
                "REASON": m.group(5).strip(),
                "MARK_REM": m.group(6),
                "USER_ID": m.group(7),
                "CHK_ID": m.group(8),
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", "")
            }
            rows.append(row)
            
    if not rows:
        rows.append({
            "SR_NO": "", "ACCOUNT_NO": "", "TYPE_OF_ACCOUNT": "",
            "LIEN_AMOUNT": "", "REASON": "", "MARK_REM": "",
            "USER_ID": "", "CHK_ID": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
