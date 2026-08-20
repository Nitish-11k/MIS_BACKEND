import os
from app.parser.reader import read_report_lines
from app.parser.metadata import extract_metadata
from app.parser.registry import REGISTRY
from app.db.tables import create_table_if_not_exists, insert_rows


def table_name_from_filename(filepath):
    base = os.path.basename(filepath)
    for ext in [".txt.gz", ".gz", ".txt", ".csv"]:
        if base.endswith(ext):
            base = base[: -len(ext)]
            break
    base = base.upper().replace("-", "_").replace(" ", "_")
    # remove any leftover non-alphanumeric/underscore characters
    import re
    base = re.sub(r"[^A-Z0-9_]", "_", base)
    base = re.sub(r"_+", "_", base).strip("_")
    return base


def process_file(filepath):
    raw_lines = list(read_report_lines(filepath))
    metadata = extract_metadata(raw_lines)
    report_id = metadata.get("REPORT_ID", "UNKNOWN")
    
    base_name = os.path.basename(filepath).lower()
    
    # Disambiguate multi-report IDs based on filename
    if report_id == "GN7484":
        if "transfer_supplementary" in base_name:
            report_id = "GN7484_3"
        elif "supplimentary_report" in base_name:
            report_id = "GN7484_2"
    elif report_id == "GN7516":
        if "transfer_supplementary" in base_name:
            report_id = "GN7516_2"
    
    if report_id == "UNKNOWN" or report_id not in REGISTRY:
        # Smart detection for shadow files based on line length
        if "shadow" in base_name:
            data_line = next((l for l in raw_lines if len(l.strip()) > 200), "")
            if len(data_line) >= 700:
                report_id = "shadow_file"
                print(f"Smart matched shadow_file (dep) from line length {len(data_line)}")
            elif len(data_line) >= 500:
                report_id = "loan_shadow_file"
                print(f"Smart matched loan_shadow_file from line length {len(data_line)}")

        # Fallback to filename matching if report_id is still unknown
        if report_id == "UNKNOWN" or report_id not in REGISTRY:
            for k in sorted(REGISTRY.keys(), key=len, reverse=True):
                if k.lower() in base_name:
                    report_id = k
                    print(f"Fallback matched {k} from filename {base_name}")
                    break

    if report_id not in REGISTRY:
        print(f"SKIPPED (no parser yet): {filepath}  [REPORT_ID={report_id}]")
        return None

    parser_func = REGISTRY[report_id]
    rows = parser_func(raw_lines)

    table_name = parser_func.__module__.split('.')[-1].upper()

    if not rows:
        print(f"WARNING: 0 rows extracted from {filepath}")
        return None

    column_names = [k for k in rows[0].keys() if k != "_IS_SCHEMA_ONLY"]
    column_names = ["original_id" if c.lower() == "id" else c for c in column_names]
    
    # Filter out dummy schema rows
    data_rows = [r for r in rows if not r.get("_IS_SCHEMA_ONLY")]

    primary_key_columns = None
    if "SR_NO" in column_names:
        primary_key_columns = ["SR_NO", "BRANCH_CODE", "PROC_DATE"]
    elif "SLNO" in column_names:
        primary_key_columns = ["SLNO", "GL_CLASS_CODE", "BRANCH_CODE", "PROC_DATE"]
    elif "GL_CLASS_CODE" in column_names:
        if "NAME" in column_names:
            primary_key_columns = ["GL_CLASS_CODE", "NAME", "BRANCH_CODE", "PROC_DATE"]
        else:
            primary_key_columns = ["GL_CLASS_CODE", "BRANCH_CODE", "PROC_DATE"]
    elif "LOAN_ACCOUNT" in column_names:
        primary_key_columns = ["LOAN_ACCOUNT", "BRANCH_CODE", "PROC_DATE"]
    elif "S1_NO" in column_names:
        primary_key_columns = ["S1_NO", "BRANCH_CODE", "PROC_DATE"]
    elif "ACCOUNT_NUM" in column_names:
        primary_key_columns = ["ACCOUNT_NUM", "BRANCH_CODE", "PROC_DATE"]
    elif "ACCNO" in column_names:
        primary_key_columns = ["ACCNO", "BRANCH_CODE", "PROC_DATE"]
        
    table = create_table_if_not_exists(table_name, column_names, primary_key_columns)
    
    if data_rows:
        # Strip out _IS_SCHEMA_ONLY and handle ID conflict
        for r in data_rows:
            r.pop("_IS_SCHEMA_ONLY", None)
            if "ID" in r:
                r["original_id"] = r.pop("ID")
            if "id" in r:
                r["original_id"] = r.pop("id")
                
            # Pad missing columns with empty string to prevent SQL insert failures
            for col in column_names:
                if col not in r:
                    r[col] = ""
            
        insert_rows(table, data_rows, primary_key_columns)
    else:
        print(f"INFO: Table {table_name} ensured, but 0 data rows to insert from {filepath}.")
        

    print(f"OK: {filepath} -> {table_name} ({len(rows)} rows)")
    return table_name