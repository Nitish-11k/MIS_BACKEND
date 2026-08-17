import sys, re

header_patch = '''    if dash_indices:
        target_idx = -1
        for idx in dash_indices:
            if idx > 0 and '|' in lines[idx-1]:
                target_idx = idx
                break
                
        if target_idx == -1:
            target_idx = dash_indices[0]'''

schema_patch = '''        if col_indices:
            used_cols = set()
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
        
    # Patch header
    content = re.sub(r'    if dash_indices:\n        target_idx = dash_indices\[0\]\n.*?target_line = lines\[target_idx\]', header_patch + '\n        \n        target_line = lines[target_idx]', content, flags=re.DOTALL)
    
    # Patch schema row
    content = re.sub(r'        if col_indices:\n            for idx.*?row\[col_name\] = ""', schema_patch, content, flags=re.DOTALL)
    
    with open(file, 'w') as f:
        f.write(content)
    print(f'Successfully patched {file}')
