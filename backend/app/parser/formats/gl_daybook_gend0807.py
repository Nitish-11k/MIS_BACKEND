from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    data_started = False
    dash_count = 0
    
    current_account_number = ""
    current_account_name = ""
    current_home_branch = ""
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '_'}:
            dash_count += 1
            if dash_count >= 2:
                data_started = True
            continue
            
        if not data_started:
            continue
            
        # Skip lines with escape/control characters (printer codes like \x1b, \x0c etc)
        if any(ord(c) < 32 and c not in '\t' for c in stripped):
            continue
        
        stripped_upper = line.upper()
        normalized_line = ' '.join(stripped_upper.split())
        
        # Skip all known header patterns
        if "ACCOUNT NAME" in normalized_line or "VALUE DATE" in normalized_line or "TXN TYPE" in normalized_line or "ACCOUNT TOTAL" in normalized_line or "CHEQUE NO" in normalized_line:
            continue
            
        if stripped.startswith("NUMBER"):
            continue
            
        if stripped.startswith("ACCOUNT") and ("HOME" in line or "TYPE" in line or "DESCRIPTION" in line):
            continue

        if "TION REPOR" in stripped or "NIL REPORT" in stripped:
            continue
            
        parsed_acc_num = line[0:19].strip()
        parsed_acc_name = line[20:60].strip()
        
        if parsed_acc_num and not parsed_acc_num.startswith('NIL REPORT') and "TOTAL" not in parsed_acc_num.upper():
            current_account_number = parsed_acc_num
            current_account_name = parsed_acc_name
            current_home_branch = line[61:67].strip()
            # If the rest of the line is empty (no transaction data), skip creating a row
            if not line[68:].strip():
                continue
            
        if "---" in line:
            continue

        row = {
            "ACCOUNT_NUMBER": current_account_number,
            "ACCOUNT_NAME": current_account_name,
            "HOME_BRANCH": line[61:67].strip() or current_home_branch,
            "VALUE_DATE": line[68:80].strip(),
            "TXN_TYPE": line[80:102].strip(),
            "CHEQUE_NO": line[102:125].strip(),
            "DEBIT": line[125:150].strip(),
            "CREDIT": line[150:175].strip(),
            "USER_ID": line[175:185].strip(),
            "CHK1_ID": line[185:195].strip(),
            "CHK2_ID": line[195:205].strip(),
            "SUP_ID": line[205:].strip(),
        }
        
        # Row must have at least one of these to be a valid transaction row
        if not row['VALUE_DATE'] and not row['TXN_TYPE'] and not row['DEBIT'] and not row['CREDIT'] and not row['USER_ID']:
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "ACCOUNT_NUMBER": "",
            "ACCOUNT_NAME": "",
            "HOME_BRANCH": "",
            "VALUE_DATE": "",
            "TXN_TYPE": "",
            "CHEQUE_NO": "",
            "DEBIT": "",
            "CREDIT": "",
            "USER_ID": "",
            "CHK1_ID": "",
            "CHK2_ID": "",
            "SUP_ID": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
