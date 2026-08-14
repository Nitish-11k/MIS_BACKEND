import re
from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def clean_col_name(name):
    name = re.sub(r"[^A-Za-z0-9]+", "_", name)
    return name.strip("_").upper() or "COL"

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    # Clean lines without destroying pipes
    cleaned = [l.rstrip('\n\r') for l in raw_lines if l.strip() != ""]
    no_boiler = remove_boilerplate_lines(cleaned)

    # Find the grid block
    grid_lines = [l for l in no_boiler if "|" in l]
    if not grid_lines:
        return []

    # Find separator lines (mostly dashes, pluses, pipes)
    sep_lines = [i for i, l in enumerate(grid_lines) if set(l.replace(" ", "")) <= {"|", "-", "+"}]
    if not sep_lines:
        return []

    # The line right before the first data line is usually the last sep_line
    main_sep_idx = sep_lines[-1]
    main_sep = grid_lines[main_sep_idx]
    
    header_lines = grid_lines[:main_sep_idx]
    data_lines = grid_lines[main_sep_idx+1:]
    
    # Exclude any trailing pure dash lines from data_lines
    data_lines = [l for l in data_lines if not set(l.replace(" ", "")) <= {"|", "-", "+"}]


    # Find the pipes in main_sep
    data_pipes = [i for i, c in enumerate(main_sep) if c == "|" or c == "+"]
    if len(data_pipes) < 2:
        return []

    columns = []
    for i in range(len(data_pipes) - 1):
        d_start = data_pipes[i]
        d_end = data_pipes[i+1]
        
        col_parts = []
        for h in header_lines:
            h_left = h.rfind('|', 0, d_start + 1)
            h_right = h.find('|', d_end)
            
            if h_left != -1 and h_right != -1:
                part = h[h_left+1:h_right].strip()
                if part and not set(part) <= {"-", " "}:
                    col_parts.append(part)
        
        col_name = "_".join(clean_col_name(p) for p in col_parts if p)
        if not col_name:
            col_name = f"COL_{i+1}"
        columns.append(col_name)

    # Parse data lines
    rows = []
    for line in data_lines:
        row = {}
        for i in range(len(data_pipes) - 1):
            d_start = data_pipes[i]
            d_end = data_pipes[i+1]
            if d_end < len(line):
                val = line[d_start+1:d_end].strip()
            else:
                val = line[d_start+1:].strip().rstrip("|")
            row[columns[i]] = val
        rows.append(row)

    # Attach metadata
    for row in rows:
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
    
    return rows
