from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)
    
    rows = []
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Ignore lines made entirely of dashes, equals, or decorators
        if set(stripped) <= {'-', '=', '|', ' '}:
            continue
            
        if not stripped.startswith('|') or not stripped.endswith('|'):
            continue
            
        parts = [p.strip() for p in stripped.split('|')][1:-1]
        
        # Valid data rows should have at least 10 columns
        if len(parts) >= 10:
            # Check if it's a data row by verifying SL NO is a digit
            if not parts[0].isdigit():
                continue
                
            row = {
                "SL_NO": parts[0],
                "PRODUCT_SUBPRODUCT_TYPE": parts[1],
                "ACCOUNT_NUMBER": parts[2],
                "NAME_OF_BORROWER": parts[3],
                "LIMIT_AMOUNT": parts[4],
                "DRAWING_POWER": parts[5],
                "OUTSTANDING": parts[6],
                "IRREGULARITY": parts[7],
                "DATE_OF_COMMENCEMENT": parts[8],
                "AUTHORISING_OFFICIAL_ID": parts[9],
                
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", "")
            }
            rows.append(row)
            
    if not rows:
        rows.append({
            "SL_NO": "", "PRODUCT_SUBPRODUCT_TYPE": "", "ACCOUNT_NUMBER": "",
            "NAME_OF_BORROWER": "", "LIMIT_AMOUNT": "", "DRAWING_POWER": "",
            "OUTSTANDING": "", "IRREGULARITY": "", "DATE_OF_COMMENCEMENT": "",
            "AUTHORISING_OFFICIAL_ID": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
