import re
from app.parser.cleaner import cleaned_lines, remove_boilerplate_lines
from app.parser.metadata import extract_metadata
from app.parser.tablename import extract_table_name

def clean_col_name(name):
    name = re.sub(r"[^A-Za-z0-9]+", "_", name)
    return name.strip("_").upper() or "COL"

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    cleaned = cleaned_lines(raw_lines)
    no_boiler = remove_boilerplate_lines(cleaned)
    table_name = extract_table_name(no_boiler)

    header_lines = []
    data_lines = []
    seen_header_block = False

    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue

        is_dash_line = set(stripped) <= {"-"}
        if is_dash_line:
            if header_lines and not seen_header_block:
                seen_header_block = True
            continue

        if "|" not in line:
            continue

        if not seen_header_block:
            header_lines.append(line)
        else:
            data_lines.append(line)

    columns = []

    for h_line in header_lines:
        cells = [c.strip() for c in h_line.split("|")]
        cells = [c for c in cells if c != ""]
        for cell in cells:
            name = clean_col_name(cell)
            if not columns or columns[-1] != name:
                columns.append(name)

    rows = []

    for line in data_lines:
        cells = [c.strip() for c in line.split("|")]
        cells = [c for c in cells if c != "" or True]
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        row = {}
        for i, col_name in enumerate(columns):
            row[col_name] = cells[i] if i < len(cells) else ""
        rows.append(row)

        row["BRANCH_CODE"] = metadata["BRANCH_CODE"]
        row["BRANCH_NAME"] = metadata["BRANCH_NAME"]
        row["PROC_DATE"] = metadata["PROC_DATE"]
    
    return table_name, rows