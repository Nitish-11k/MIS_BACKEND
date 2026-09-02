import re
from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    current_row = None
    data_started = False
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '_'}:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if "SL NO." in stripped or "ACTUAL VARIANCE" in stripped:
            continue
            
        # Is it a new record starting with SL NO?
        if re.match(r'^\d{2}', line):
            if current_row:
                rows.append(current_row)
                
            current_row = {
                "SL_NO": line[0:9].strip(),
                "COLLATERAL_NO": line[10:22].strip(),
                "CUSTOMER_NAME": line[23:105].strip(),
                "BENCHMARK_LEVEL": line[105:120].strip(),
                "TOLERANCE_LEVEL": line[121:].strip(),
                
                "ACTUAL_VARIANCE": "",
                "ACCOUNT_NO": "",
                "SYSTEM": "",
                "OUTSTANDING": "",
                "DRAWING_POWER": "",
                "IRREGULARITY": "",
                "REMARKS": "",
                
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", "")
            }
        elif current_row and not re.match(r'^\d{2}', line):
            # It's line 2
            current_row["ACTUAL_VARIANCE"] = line[0:28].strip()
            current_row["ACCOUNT_NO"] = line[29:42].strip()
            current_row["SYSTEM"] = line[43:55].strip()
            current_row["OUTSTANDING"] = line[56:75].strip()
            current_row["DRAWING_POWER"] = line[76:95].strip()
            current_row["IRREGULARITY"] = line[95:110].strip()
            current_row["REMARKS"] = line[111:].strip()

    if current_row:
        rows.append(current_row)

    if not rows:
        rows.append({
            "SL_NO": "",
            "COLLATERAL_NO": "",
            "CUSTOMER_NAME": "",
            "BENCHMARK_LEVEL": "",
            "TOLERANCE_LEVEL": "",
            "ACTUAL_VARIANCE": "",
            "ACCOUNT_NO": "",
            "SYSTEM": "",
            "OUTSTANDING": "",
            "DRAWING_POWER": "",
            "IRREGULARITY": "",
            "REMARKS": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
