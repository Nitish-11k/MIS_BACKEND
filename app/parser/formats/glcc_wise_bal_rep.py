from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    data_started = False
    current_gl_class = None
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-'}:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if stripped.startswith("GL CLASS CODE"):
            parts = stripped.split()
            if len(parts) >= 4:
                current_gl_class = parts[3]
            continue
            
        row = {
            "SLNO": line[0:9].strip(),
            "CUSTOMER": line[10:27].strip(),
            "ACCOUNT": line[28:42].strip(),
            "NAME_OF_ACCOUNT": line[43:73].strip(),
            "DR_BALANCE": line[74:91].strip(),
            "CR_BALANCE": line[92:109].strip(),
            "INT_BALANCE": line[110:123].strip(),
            "RATE": line[124:132].strip(),
            "OD_DR_INT_BAL": line[133:147].strip(),
            "UNCLRED_BAL": line[148:163].strip(),
            "COLL_AMT": line[164:].strip(),
        }
        
        if not row['SLNO'].strip() and not row['CUSTOMER'].strip():
            continue
            
        if "SLNO" in row['SLNO'].upper() or "NO OF" in row['SLNO'].upper():
            continue
            
        if "GRANT" in row['SLNO'].upper() or "TOTAL" in row['SLNO'].upper() or "TOTAL" in row['CUSTOMER'].upper():
            continue
            
        row["GL_CLASS_CODE"] = current_gl_class or ""
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "SLNO": "",
            "CUSTOMER": "",
            "ACCOUNT": "",
            "NAME_OF_ACCOUNT": "",
            "DR_BALANCE": "",
            "CR_BALANCE": "",
            "INT_BALANCE": "",
            "RATE": "",
            "OD_DR_INT_BAL": "",
            "UNCLRED_BAL": "",
            "COLL_AMT": "",
            "GL_CLASS_CODE": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
