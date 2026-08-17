import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)
    
    rows = []
    data_started = False
    
    # Regex for data row
    regex = r'^\s*([\w-]+)\s+(.+?)\s+(\d{5})\s+([A-Z0-9]+)\s+(\d{2}-\d{2}-\d{4})\s+([A-Z]{3})\s+([-\d.,]+\s*(?:CR|DR)?)\s*(.*?)\s*(\d+)$'
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '='}:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        # Ignore total lines as per user request
        if "TOTAL" in stripped.upper():
            continue
            
        if "ACCOUNT-NO" in stripped and "ACCOUNT-NAME" in stripped:
            continue
            
        m = re.match(regex, line)
        if m:
            row = {
                "ACCOUNT_NO": m.group(1),
                "ACCOUNT_NAME": m.group(2).strip(),
                "BRANCH_NO": m.group(3),
                "REFERENCE_NO": m.group(4),
                "POST_DATE": m.group(5),
                "ENTRY_TYPE": m.group(6),
                "AMT_OUTSTD": m.group(7).strip(),
                "DESC": m.group(8).strip(),
                "AGE_DAYS": m.group(9),
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", "")
            }
            rows.append(row)
            
    if not rows:
        rows.append({
            "ACCOUNT_NO": "", "ACCOUNT_NAME": "", "BRANCH_NO": "",
            "REFERENCE_NO": "", "POST_DATE": "", "ENTRY_TYPE": "",
            "AMT_OUTSTD": "", "DESC": "", "AGE_DAYS": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
