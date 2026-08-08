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
    raw_lines = read_report_lines(filepath)
    metadata = extract_metadata(raw_lines)
    report_id = metadata["REPORT_ID"]

    if report_id not in REGISTRY:
        print(f"SKIPPED (no parser yet): {filepath}  [REPORT_ID={report_id}]")
        return None

    parser_func = REGISTRY[report_id]
    rows = parser_func(raw_lines)

    table_name = table_name_from_filename(filepath)

    if not rows:
        print(f"WARNING: 0 rows extracted from {filepath}")
        return None

    print(f"\n--- Preview: {table_name} ({len(rows)} rows total) ---")
    print("Columns:", list(rows[0].keys()))
    for row in rows[:5]:
        print(row)
    print("--- End preview ---\n")

    column_names = list(rows[0].keys())
    primary_key_columns = ["SR_NO", "BRANCH_CODE", "PROC_DATE"]
    table = create_table_if_not_exists(table_name, column_names, primary_key_columns)
    insert_rows(table, rows, primary_key_columns)
    print(f"OK: {filepath} -> {table_name} ({len(rows)} rows)")
    return table_name