import os
import sys
import pandas as pd
from app.parser.cleaner import cleaned_lines, remove_boilerplate_lines
from app.parser.tablename import extract_table_name
from app.parser.header import extract_columns_from_headers
from app.parser.rows import extract_rows
from app.parser.metadata import extract_metadata

def txt_to_excel(txt_filepath, output_dir=None):
    if not txt_filepath.endswith(".txt"):
        print("Error: Input file must end with .txt")
        return None
        
    if output_dir is None:
        output_dir = os.path.dirname(txt_filepath)
        
    os.makedirs(output_dir, exist_ok=True)
    
    # Extract the original filename without .txt
    base_name = os.path.basename(txt_filepath)
    excel_filename = base_name[:-4] + ".xlsx"
    output_filepath = os.path.join(output_dir, excel_filename)
    
    print(f"Reading {txt_filepath}...")
    try:
        with open(txt_filepath, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Failed to read file: {e}")
        return None
        
    print("Parsing file contents...")
    metadata = extract_metadata(lines)
    cleaned = cleaned_lines(lines)
    no_boilerplate = remove_boilerplate_lines(cleaned)
    
    table_name = extract_table_name(no_boilerplate)
    print("Detected Table Name:", table_name)
    
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
            
    print(f"Found {len(header_lines)} header lines and {len(data_lines)} data lines.")
    
    columns = extract_columns_from_headers(header_lines, data_lines, separator_line)
    columns = [col for col in columns if col[0] != 'SR_NO']
    
    rows = extract_rows(data_lines, columns)
    
    # Add metadata to each row
    for row in rows:
        row["BRANCH_CODE"] = metadata["BRANCH_CODE"]
        row["BRANCH_NAME"] = metadata["BRANCH_NAME"]
        row["PROC_DATE"] = metadata["PROC_DATE"]
        
    if not rows:
        print("Warning: No data rows extracted!")
        return None
        
    print(f"Extracted {len(rows)} rows. Generating Excel file...")
    
    # Convert to pandas DataFrame
    df = pd.DataFrame(rows)
    
    # Ensure columns match the detected order + metadata
    column_names = [c[0] for c in columns]
    column_names.extend(["BRANCH_CODE", "BRANCH_NAME", "PROC_DATE"])
    
    # Only keep the columns that actually exist in the DataFrame
    valid_columns = [col for col in column_names if col in df.columns]
    df = df[valid_columns]
    
    try:
        df.to_excel(output_filepath, index=False)
        print(f"Success! Excel saved to {output_filepath}")
        return output_filepath
    except Exception as e:
        print(f"Failed to save Excel file: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m exporter.to_excel <path_to_txt_file> [output_directory]")
    else:
        txt_file = sys.argv[1]
        out_dir = sys.argv[2] if len(sys.argv) > 2 else None
        txt_to_excel(txt_file, out_dir)
