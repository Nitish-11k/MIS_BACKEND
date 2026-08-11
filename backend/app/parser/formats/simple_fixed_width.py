from app.parser.cleaner import cleaned_lines, remove_boilerplate_lines
from app.parser.metadata import extract_metadata
from app.parser.header import extract_columns_from_headers
from app.parser.rows import extract_rows


def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    cleaned = cleaned_lines(raw_lines)
    no_boiler = remove_boilerplate_lines(cleaned)

    dash_indices = [
        i for i, line in enumerate(no_boiler)
        if line.strip() != "" and set(line.strip()) <= {"-"}
    ]

    if len(dash_indices) < 2:
        print("WARNING: could not find header boundaries (need 2 dash-lines)")
        return []

    first_dash = dash_indices[0]
    second_dash = dash_indices[1]

    separator_line = no_boiler[first_dash]
    header_line = no_boiler[first_dash + 1]
    header_stripped = header_line.strip()

    title_lines_stripped = [t.strip() for t in no_boiler[:first_dash] if t.strip()]

    data_lines = []
    for line in no_boiler[second_dash + 1:]:
        stripped = line.strip()
        if not stripped:
            continue
        if set(stripped) <= {"-"}:
            continue
        if stripped == header_stripped:
            continue
        if stripped in title_lines_stripped:
            continue
        data_lines.append(line)

    columns = extract_columns_from_headers([header_line], data_lines, separator_line)
    rows = extract_rows(data_lines, columns)

    for row in rows:
        row["REPORT_ID"] = metadata["REPORT_ID"]
        row["BRANCH_CODE"] = metadata["BRANCH_CODE"]
        row["BRANCH_NAME"] = metadata["BRANCH_NAME"]
        row["PROC_DATE"] = metadata["PROC_DATE"]

    return rows