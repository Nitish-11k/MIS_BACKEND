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
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if any(kw in stripped.upper() for kw in ['REPORT ID', 'BRANCH CODE', 'PAGE NO', 'DATE', 'TOTAL']):
            continue
            
        row = {}
        # 1: Account number (10-15 digits)
        m1 = re.match(r'^(\d{10,16})\s+', stripped)
        if m1:
            row['ACCOUNT_NO'] = m1.group(1)
            rest = stripped[m1.end():].strip()
            
            # The remaining is: TYPE (string), NAME (string), and then 5 numeric fields, a date, and a number.
            # Look for the sequence of numbers at the end.
            # Typically it is: LIMIT INT_RATE THEO_BAL OUTSTANDING IRREGULARITY DATE STATUS
            m2 = re.search(r'\s+([\d,]+\.\d{2})\s+(\d{2}\.\d{3})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(\d{2}-\d{2}-\d{4})\s+(\d+)', rest)
            
            if m2:
                row['LIMIT'] = m2.group(1)
                row['INT_RATE'] = m2.group(2)
                row['THEO_BAL'] = m2.group(3)
                row['OUTSTANDING'] = m2.group(4)
                row['IRREGULARITY'] = m2.group(5)
                row['SANCTION_DATE'] = m2.group(6)
                row['STATUS'] = m2.group(7)
                
                # Everything before LIMIT is TYPE and NAME
                type_and_name = rest[:m2.start()].strip()
                
                # TYPE is usually up to 25 chars, or we can just split by 2+ spaces
                tn_parts = re.split(r'\s{2,}', type_and_name)
                if len(tn_parts) >= 2:
                    row['TYPE'] = tn_parts[0]
                    row['NAME'] = " ".join(tn_parts[1:])
                else:
                    row['TYPE'] = type_and_name
                    row['NAME'] = type_and_name
        
        if 'ACCOUNT_NO' in row:
            row["REPORT_ID"] = metadata.get("REPORT_ID", "")
            row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
            row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
            row["PROC_DATE"] = metadata.get("PROC_DATE", "")
            rows.append(row)
            
    if not rows:
        rows.append({
            "ACCOUNT_NO": "", "TYPE": "", "NAME": "", "LIMIT": "",
            "INT_RATE": "", "THEO_BAL": "", "OUTSTANDING": "", 
            "IRREGULARITY": "", "SANCTION_DATE": "", "STATUS": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
