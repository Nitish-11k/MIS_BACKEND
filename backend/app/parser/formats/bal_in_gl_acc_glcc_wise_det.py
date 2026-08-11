from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    # Clean lines
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    current_gl_class_code = ""

    for line in no_boiler:
        # Skip totals and dividers
        if "====>" in line or "TOTAL" in line or line.strip().startswith("-") or not line.strip():
            continue
        
        # Subgroup header
        if line.startswith("GL CLASS CODE"):
            current_gl_class_code = line.replace("GL CLASS CODE", "").strip()
            continue
        
        # Data line detection (starts with a serial number)
        if line[:8].strip().isdigit():
            slno = line[0:8].strip()
            account_no = line[8:27].strip()
            ledger_name = line[27:61].strip()
            currency = line[61:71].strip()
            dr_balance = line[71:93].strip()
            cr_balance = line[93:].strip()
            
            row = {
                "SLNO": slno,
                "ACCOUNT_NO": account_no,
                "LEDGER_NAME": ledger_name,
                "CURRENCY": currency,
                "DR_BALANCE": dr_balance,
                "CR_BALANCE": cr_balance,
                "GL_CLASS_CODE": current_gl_class_code,
                
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", ""),
            }
            rows.append(row)

    return rows
