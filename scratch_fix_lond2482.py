import os

# These are the files I manually created earlier, replacing them with dynamic ones
unparsed_files = [
  "Id_Least_Transaction_lond2482.txt.gz",
  "Id_Users_Logged_No_Transactions_lond2482.txt.gz",
  "Id_Users_Terminals_Not_Logged_lond2482.txt.gz"
]

template = """from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata
from app.parser.dynamic_columns import get_column_indices_from_dashes

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\\n\\r') for l in raw_lines]
    
    # Extract headers and dash line to infer columns dynamically
    col_indices = []
    headers = []
    header_lines_for_parsing = []
    for i, line in enumerate(lines):
        if set(line.strip()) <= {'-', ' '} and len(line.strip()) > 20:
            if i > 0:
                # Capture up to 3 lines above as header lines
                start_h = max(0, i - 3)
                header_lines_for_parsing = lines[start_h:i]
                
                # Use the immediately preceding line for header names
                if len(lines[i-1].strip()) > 10:
                    last_h = lines[i-1]
                    if '|' in last_h:
                        headers = [h.strip() for h in last_h.split('|') if h.strip()]
                    else:
                        import re
                        headers = [h.strip() for h in re.split(r' {2,}', last_h) if h.strip()]
                        
            col_indices = get_column_indices_from_dashes(line, header_lines_for_parsing)
            break

    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    data_started = False
    dash_count = 0
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Ignore lines made entirely of dashes, underscores, equals, or decorators
        if set(stripped) <= {'-', '_', '=', ' ', '<', '>', '|'}:
            dash_count += 1
            if dash_count >= 2:
                data_started = True
            continue
            
        # Explicitly skip header rows that contain common report keywords
        if "TRANSFER" in stripped and "ACCOUNT NO" in stripped:
            continue
        if "CUSTOMER/BGL ACCT NAME" in stripped:
            continue
        if "CASH" in stripped and "CLEARING" in stripped and "TRANSFER" in stripped:
            continue
        if "CREDITS" in stripped and "DEBITS" in stripped:
            continue
        if "SR_NO" in stripped and "ACCT_NO" in stripped:
            continue
        if "TOT VOUCH" in stripped or "TOTAL" in stripped:
            continue
            
        if not data_started:
            continue
            
        if any(ord(c) < 32 and c not in '\\t' for c in stripped):
            continue

        if not col_indices:
            # Fallback if no dashes found
            row = {"RAW_LINE": line.strip()[:200]}
        else:
            row = {}
            used_cols = set()
            for idx, (s, e) in enumerate(col_indices):
                col_name = headers[idx] if idx < len(headers) else f"COL_{idx}"
                # sanitize column name
                col_name = "".join(c for c in col_name if c.isalnum() or c == '_').upper()
                if not col_name: col_name = f"COL_{idx}"
                
                # Disambiguate duplicate column names (like CASH vs CASH_1)
                original_col_name = col_name
                counter = 1
                while col_name in used_cols:
                    col_name = f"{original_col_name}_{counter}"
                    counter += 1
                used_cols.add(col_name)
                
                val = line[s:e].strip()
                # strip weird symbol artifacts inside values
                val = val.replace('=>', '').replace('<-', '').strip('|').strip()
                row[col_name] = val
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        # basic empty check
        if len(row) > 4:
            first_val = list(row.values())[0]
            if not first_val or "TOTAL" in str(first_val).upper() or first_val.startswith('NIL'):
                continue
                
        rows.append(row)

    if not rows:
        # Schema only row
        row = {}
        if col_indices:
            for idx, (s, e) in enumerate(col_indices):
                col_name = headers[idx] if idx < len(headers) else f"COL_{idx}"
                col_name = "".join(c for c in col_name if c.isalnum() or c == '_').upper()
                if not col_name: col_name = f"COL_{idx}"
                row[col_name] = ""
        else:
            row["RAW_LINE"] = ""
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        row["_IS_SCHEMA_ONLY"] = True
        rows.append(row)

    return rows
"""

parser_dir = r"C:\Users\dell\Desktop\bank_mis_parser_backend\app\parser\formats"

for f in unparsed_files:
    base = f.replace(".txt.gz", "").lower().replace("-", "_").replace(".", "_")
    py_file = os.path.join(parser_dir, base + ".py")
    with open(py_file, "w") as out:
        out.write(template)
    print(f"Updated {py_file} with refined dynamic parser")
