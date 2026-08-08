from app.parser.reader import read_report_lines
from app.parser.cleaner import cleaned_lines, remove_boilerplate_lines
from app.parser.tablename import extract_table_name
from app.parser.header import extract_columns_from_headers
from app.parser.rows import extract_rows
from app.db.tables import create_table_if_not_exists, insert_rows
from app.parser.metadata import extract_metadata


lines = read_report_lines(r"C:\Users\\dell\Desktop\\MIS_TOOL\\20250425\\20250425\\00001\ACCOUNT_CLOSED_REPORT.txt.gz")
metadata = extract_metadata(lines)

cleaned = cleaned_lines(lines)
no_boilerplate = remove_boilerplate_lines(cleaned)

table_name = extract_table_name(no_boilerplate)
print("Table Name: ", table_name)

table_name_line = None
for line in no_boilerplate:
    if extract_table_name([line]) == table_name:
        table_name_line = line
        break

blocks = []
current_block = []
separators = []

for line in no_boilerplate:
    if line == table_name_line:
        continue
        
    import re
    non_spaces = len(line.replace(" ", ""))
    has_words = bool(re.search(r'[A-Za-z]{2,}', line))
    is_sep = non_spaces > 0 and not has_words and (line.count('-') / non_spaces > 0.5 or line.count('=') / non_spaces > 0.5)
    
    if is_sep:
        if current_block:
            blocks.append(current_block)
            current_block = []
        separators.append(line)
    else:
        current_block.append(line)
        
if current_block:
    blocks.append(current_block)
    
header_lines = []
data_lines = []
separator_line = None

if len(blocks) > 1:
    # Grid report with separators
    header_lines = blocks[0]
    for b in blocks[1:]:
        for line in b:
            if "REPORT" in line.upper() and len(line.strip()) > 10:
                continue
            data_lines.append(line)
    # The separator separating headers and data
    separator_line = separators[0] if separators else None
elif len(blocks) == 1:
    # No separators, fallback to heuristic
    for line in blocks[0]:
        digits = sum(c.isdigit() for c in line)
        if digits > 4 and len(data_lines) == 0:
            data_lines.append(line)
        elif len(data_lines) > 0:
            if line in header_lines:
                continue
            if "REPORT" in line.upper() and len(line.strip()) > 10:
                continue
            data_lines.append(line)
        else:
            header_lines.append(line)

print(f"Detected {len(header_lines)} header lines and {len(data_lines)} data lines.")

columns = extract_columns_from_headers(header_lines, data_lines, separator_line)
columns = [col for col in columns if col[0] != 'SR_NO']
print("Columns detected:", [c[0] for c in columns])

rows = extract_rows(data_lines, columns)

for row in rows:
    row["BRANCH_CODE"] = metadata["BRANCH_CODE"]
    row["BRANCH_NAME"] = metadata["BRANCH_NAME"]
    row["PROC_DATE"] = metadata["PROC_DATE"]

if rows:
    print("Total rows: ", len(rows))
    print("First row: ", rows[0])
else:
    print("No rows extracted!")

column_names = [c[0] for c in columns]
column_names.extend(["BRANCH_CODE", "BRANCH_NAME", "PROC_DATE"])
table = create_table_if_not_exists(table_name, column_names)
insert_rows(table, rows)
print(f"Inserted {len(rows)} rows into {table_name}")