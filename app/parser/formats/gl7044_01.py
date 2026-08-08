from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    # Clean lines
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    current_gl_class_code = ""
    current_product_name = ""

    for line in no_boiler:
        # Skip totals and dividers
        if "====>" in line or "TOTAL" in line or line.strip().startswith("-") or not line.strip():
            continue
        
        # Subgroup header (e.g. GL CLASS CODE  00001INR1041010306                  Staff Education Loan)
        if line.startswith("GL CLASS CODE"):
            parts = line.replace("GL CLASS CODE", "").strip().split("  ", 1)
            current_gl_class_code = parts[0].strip() if len(parts) > 0 else ""
            current_product_name = parts[1].strip() if len(parts) > 1 else ""
            continue
        
        # Data line detection (starts with a serial number)
        if line[:10].strip().isdigit():
            slno = line[0:10].strip()
            customer = line[10:28].strip()
            account = line[28:42].strip()
            name = line[42:80].strip()
            dr_balance = line[80:100].strip()
            cr_balance = line[100:113].strip()
            
            int_bal_rate_raw = line[113:136].strip().split()
            int_balance = int_bal_rate_raw[0] if int_bal_rate_raw else ""
            int_rate = int_bal_rate_raw[1] if len(int_bal_rate_raw) > 1 else ""
            
            ytd_cy = line[136:155].strip()
            ytd_py = line[155:175].strip()
            unpd_int = line[175:].strip()
            
            row = {
                "SLNO": slno,
                "CUSTOMER": customer,
                "ACCOUNT": account,
                "NAME_OF_ACCOUNT": name,
                "DR_BALANCE": dr_balance,
                "CR_BALANCE": cr_balance,
                "INT_BALANCE": int_balance,
                "INT_RATE": int_rate,
                "INT_YTD_CY": ytd_cy,
                "INT_YTD_PY": ytd_py,
                "UNPD_INT": unpd_int,
                
                "GL_CLASS_CODE": current_gl_class_code,
                "PRODUCT_NAME": current_product_name,
                
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", ""),
            }
            rows.append(row)

    return rows
