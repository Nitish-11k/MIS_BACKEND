import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)
    
    from_date = ""
    to_date = ""
    for line in raw_lines:
        if "DETAILS OF INVENTORY RECEIVED" in line and "FROM" in line and "TO" in line:
            m = re.search(r"FROM\s+(\d{2}/\d{2}/\d{4})\s+TO\s+(\d{2}/\d{2}/\d{4})", line)
            if m:
                from_date = m.group(1)
                to_date = m.group(2)
            break

    rows = []
    data_started = False
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '='} or stripped.startswith('---'):
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if "INVENTORY" in line and "DATE OF" in line:
            continue
        if "CATEGORY" in line and "RECEIPT" in line:
            continue
        if "REPORT ID" in line or "BRANCH CODE" in line or "PAGE NO" in line:
            continue
            
        # Parse data using fixed string slicing or regex split since columns are well-spaced
        # Typical line: "SAVINGS BANK CHEQUE BOOK       18/02/2025  sb                                                    1172        1172"
        row = {}
        
        # We can extract based on exact positions
        # However, it's safer to use regex split if there are empty columns like SERIAL NO
        # Let's use fixed-width since we know the format exactly
        if len(line) > 100:
            row["INVENTORY_CATEGORY"] = line[0:31].strip()
            row["DATE_OF_RECEIPT"] = line[31:43].strip()
            row["PREFIX"] = line[43:61].strip()
            row["SERIAL_NO_FROM"] = line[61:71].strip()
            row["SERIAL_NO_TO"] = line[71:81].strip()
            row["PIECES"] = line[81:92].strip()
            row["OPENING_BALANCE"] = line[92:104].strip()
            row["CLOSING_BALANCE"] = line[104:].strip()
        else:
            # Fallback if line is shorter
            parts = re.split(r'\s{2,}', line.strip())
            if len(parts) >= 5:
                row["INVENTORY_CATEGORY"] = parts[0]
                row["DATE_OF_RECEIPT"] = parts[1]
                row["PREFIX"] = parts[2]
                row["OPENING_BALANCE"] = parts[-2]
                row["CLOSING_BALANCE"] = parts[-1]
                # Default empty for middle ones
                row["SERIAL_NO_FROM"] = ""
                row["SERIAL_NO_TO"] = ""
                row["PIECES"] = ""
            else:
                continue
        
        if row.get("INVENTORY_CATEGORY"):
            row["FROM_DATE"] = from_date
            row["TO_DATE"] = to_date
            row["REPORT_ID"] = metadata.get("REPORT_ID", "")
            row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
            row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
            row["PROC_DATE"] = metadata.get("PROC_DATE", "")
            rows.append(row)
            
    if not rows:
        rows.append({
            "INVENTORY_CATEGORY": "", "DATE_OF_RECEIPT": "", "PREFIX": "", 
            "SERIAL_NO_FROM": "", "SERIAL_NO_TO": "", "PIECES": "", 
            "OPENING_BALANCE": "", "CLOSING_BALANCE": "",
            "FROM_DATE": from_date, "TO_DATE": to_date,
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
