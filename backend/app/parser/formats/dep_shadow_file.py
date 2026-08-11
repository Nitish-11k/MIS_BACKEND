from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    for line in no_boiler:
        stripped = line.strip()
        if not stripped: continue
        
        # Highly specialized shadow file parsing
        row = {
            "CONSTANT": line[0:3].strip(),
            "ACCOUNT_NO": line[3:20].strip(),
            "BRANCH_NO": line[20:25].strip(),
            "CUSTOMER_NO": line[25:42].strip(),
            "CUSTOMER_NAME": line[42:102].strip(),
            "DATE_VAL": line[102:110].strip(),
            "CURRENCY": line[110:113].strip(),
            "PRODUCT_CODE": line[113:116].strip(),
            "AMOUNT_1": line[116:134].strip(),
            "AMOUNT_2": line[134:152].strip(),
            "AMOUNT_3": line[152:170].strip(),
            "RAW_DATA_REMAINDER": line[170:400].strip(),
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", "")
        }
        rows.append(row)
        
    if not rows:
        rows.append({
            "CONSTANT": "",
            "ACCOUNT_NO": "",
            "BRANCH_NO": "",
            "CUSTOMER_NO": "",
            "CUSTOMER_NAME": "",
            "DATE_VAL": "",
            "CURRENCY": "",
            "PRODUCT_CODE": "",
            "AMOUNT_1": "",
            "AMOUNT_2": "",
            "AMOUNT_3": "",
            "RAW_DATA_REMAINDER": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
