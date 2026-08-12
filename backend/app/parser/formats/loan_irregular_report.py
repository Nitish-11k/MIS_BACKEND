import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

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
            
        if set(stripped) <= {'-', '='}:
            if 'APPROVAL' in line or 'OUTSTANDING' in line:
                pass # it's the dash line below header
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if any(kw in stripped.upper() for kw in ['REPORT ID', 'BRANCH CODE', 'PAGE NO', 'DATE']):
            continue
            
        parts = re.split(r'\s{2,}', stripped)
        if len(parts) < 5:
            continue
            
        row = {}
        m = re.match(r'^(\d+)\s+([\d-]+)', stripped)
        if m:
            row['SR_NO'] = m.group(1)
            row['ACCOUNT_NO'] = m.group(2)
            rest = stripped[m.end():].strip()
            m2 = re.search(r'\s(\d{4})\s+(\d{3,4})\s', rest)
            if m2:
                row['NAME_OF_BORROWER'] = rest[:m2.start()].strip()
                row['TYPE'] = m2.group(1)
                row['CAT'] = m2.group(2)
                rest = rest[m2.end():].strip()
                m3 = re.search(r'\s(\d{2}-\d{2}-\d{4})\s', rest)
                if m3:
                    row['DESCRIPT'] = rest[:m3.start()].strip()
                    row['APPROVAL_DATE'] = m3.group(1)
                    rest = rest[m3.end():].strip()
                    num_parts = re.split(r'\s{2,}', rest)
                    row['OUTSTANDING'] = num_parts[0] if len(num_parts) > 0 else ''
                    row['THEO_BAL'] = num_parts[1] if len(num_parts) > 1 else ''
                    row['IRREGULARITY'] = num_parts[2] if len(num_parts) > 2 else ''
                    row['INTEREST'] = num_parts[3] if len(num_parts) > 3 else ''
                    row['REMAINING_DATA'] = " ".join(num_parts[4:]) if len(num_parts) > 4 else ''
                else:
                    row['DESCRIPT'] = rest
        
        if 'ACCOUNT_NO' in row:
            row["REPORT_ID"] = metadata.get("REPORT_ID", "")
            row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
            row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
            row["PROC_DATE"] = metadata.get("PROC_DATE", "")
            rows.append(row)
            
    if not rows:
        rows.append({
            "SR_NO": "", "ACCOUNT_NO": "", "NAME_OF_BORROWER": "", 
            "TYPE": "", "CAT": "", "DESCRIPT": "", "APPROVAL_DATE": "",
            "OUTSTANDING": "", "THEO_BAL": "", "IRREGULARITY": "", "INTEREST": "",
            "REMAINING_DATA": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
