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
            
        if set(stripped) <= {'-'}:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        row = {
            "GL_CLASS_CODE": line[0:38].strip(),
            "ACT_TOTAL": line[39:50].strip(),
            "NAME": line[51:90].strip(),
            "TOTAL_AMOUNT": line[91:111].strip(),
            "TOTAL_INTEREST": line[112:131].strip(),
            "TOTAL_DR_OD_INT": line[132:151].strip(),
            "TOTAL_UNCLEARED_AMT": line[152:171].strip(),
            "TOTAL_COLLECTION_AMT": line[172:].strip(),
        }
        
        if not row['GL_CLASS_CODE'].strip() or "TOTAL" in row['GL_CLASS_CODE'].upper():
            continue
            
        if "CLASS" in row['GL_CLASS_CODE'].upper():
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "GL_CLASS_CODE": "",
            "ACT_TOTAL": "",
            "NAME": "",
            "TOTAL_AMOUNT": "",
            "TOTAL_INTEREST": "",
            "TOTAL_DR_OD_INT": "",
            "TOTAL_UNCLEARED_AMT": "",
            "TOTAL_COLLECTION_AMT": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
