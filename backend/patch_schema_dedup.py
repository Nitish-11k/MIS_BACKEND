import sys, re

patch = '''            used_cols = set()
            for idx, (s, e) in enumerate(col_indices):
                col_name = headers[idx] if idx < len(headers) else f"COL_{idx}"
                col_name = "".join(c for c in col_name if c.isalnum() or c == '_').upper()
                if not col_name: col_name = f"COL_{idx}"
                
                original_col_name = col_name
                counter = 1
                while col_name in used_cols:
                    col_name = f"{original_col_name}_{counter}"
                    counter += 1
                used_cols.add(col_name)
                
                row[col_name] = ""'''

for file in [
    'app/parser/formats/supplimentary_control_gend7484.py',
    'app/parser/formats/supplimentary_control_gend7516.py',
    'app/parser/formats/transfer_supplementary_gend7484.py',
    'app/parser/formats/transfer_supplementary_gend7516.py',
    'app/parser/formats/supplimentary_report_gend7484.py'
]:
    with open(file, 'r') as f:
        content = f.read()
        
    old_block = re.search(r'            for idx, \(s, e\) in enumerate\(col_indices\):\n                col_name = headers\[idx\].*?\n                row\[col_name\] = ""', content, re.DOTALL)
    
    if old_block:
        new_content = content[:old_block.start()] + patch + content[old_block.end():]
        with open(file, 'w') as f:
            f.write(new_content)
        print(f'Successfully patched schema row logic in {file}')
    else:
        print(f'Failed to patch {file}')
