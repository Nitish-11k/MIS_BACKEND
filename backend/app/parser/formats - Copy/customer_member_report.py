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
            
        if set(stripped) <= {'_', '|'} and '_' in stripped:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if '|' in line: # skip any headers inside the table
            continue
            
        row = {
            "SERIAL_NO": line[0:6].strip(),
            "CUSTOMER_NUMBER": line[7:25].strip(),
            "NAME_OF_CUSTOMER": line[26:87].strip(),
            "MEMBERSHIP_NUMBER": line[88:107].strip(),
            "MEMBERSHIP_TYPE": line[108:129].strip(),
            "IS_TDS_APPLICABLE": line[130:141].strip(),
            "MEMBERSHIP_DATE": line[142:].strip(),
        }
        
        # skip lines that are empty
        if not row['SERIAL_NO'].strip() and not row['CUSTOMER_NUMBER'].strip():
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "SERIAL_NO": "",
            "CUSTOMER_NUMBER": "",
            "NAME_OF_CUSTOMER": "",
            "MEMBERSHIP_NUMBER": "",
            "MEMBERSHIP_TYPE": "",
            "IS_TDS_APPLICABLE": "",
            "MEMBERSHIP_DATE": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
