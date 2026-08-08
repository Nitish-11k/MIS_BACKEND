import re

def extract_columns_from_headers(header_lines, data_lines, separator_line=None):
    if not data_lines:
        return []
        
    # Find the maximum line length
    all_lines = [l.rstrip('\n\r') for l in header_lines + data_lines]
    if separator_line:
        separator_line = separator_line.rstrip('\n\r')
        all_lines.append(separator_line)
        
    max_len = max(len(line) for line in all_lines)
    is_space = [True] * max_len
    
    # 1. FIND BOUNDARIES
    use_separator = False
    if separator_line and any(c in separator_line for c in [' ', '|', '+']):
        use_separator = True
        line = separator_line.ljust(max_len)
        for i in range(max_len):
            if line[i] not in [' ', '|', '+']:
                is_space[i] = False
                
        # Check if it actually found multiple columns
        cols = 0
        in_col = False
        for i in range(max_len):
            if not is_space[i] and not in_col:
                in_col = True
            elif is_space[i] and in_col:
                in_col = False
                cols += 1
        if cols <= 1:
            use_separator = False
            is_space = [True] * max_len
            
    if not use_separator:
        # Fallback: Vertical projection on all lines
        for line in all_lines:
            line = line.ljust(max_len)
            for i in range(max_len):
                if line[i] not in [' ', '-', '=']:
                    is_space[i] = False
                
    # Find contiguous blocks of False (data columns)
    columns = []
    in_col = False
    start = 0
    for i in range(max_len):
        if not is_space[i] and not in_col:
            in_col = True
            start = i
        elif is_space[i] and in_col:
            in_col = False
            columns.append({'start': start, 'end': i})
            
    if in_col:
        columns.append({'start': start, 'end': max_len})
        
    # Expand boundaries slightly to the left and right into the space zones
    for i in range(len(columns)):
        if i == 0:
            columns[i]['start'] = 0
        else:
            mid = (columns[i-1]['end'] + columns[i]['start']) // 2
            columns[i-1]['end'] = mid
            columns[i]['start'] = mid
            
    if columns:
        columns[-1]['end'] = max_len + 100 # give plenty of room on the right

    # 2. EXTRACT WORDS AND APPLY SPAN OVERLAPPING
    all_words = []
    if use_separator:
        for hline in header_lines:
            for match in re.finditer(r'[^\s]+(?: [^\s]+)*', hline):
                word_text = match.group().strip()
                if not re.search(r'[A-Za-z0-9]', word_text):
                    continue
                all_words.append({
                    'text': word_text,
                    'start': match.start(),
                    'end': match.end()
                })

    final_columns = []
    existing_names = []
    
    for col in columns:
        s, e = col['start'], col['end']
        header_parts = []
        
        if use_separator:
            for word in all_words:
                overlap_start = max(s, word['start'])
                overlap_end = min(e, word['end'])
                if overlap_end > overlap_start:
                    header_parts.append(word['text'])
        else:
            for hline in header_lines:
                part = hline[s:e].strip()
                if part:
                    header_parts.append(part)
                
        # Join multi-line hierarchical headers
        raw_name = "_".join(header_parts)
        if not raw_name:
            raw_name = "UNKNOWN_COL"
            
        clean_name = clean_column_name(raw_name, existing_names)
        final_columns.append([clean_name, s, e])
        
    return final_columns

def clean_column_name(name, existing_names):
    name = re.sub(r"[^A-Za-z0-9]+", "_", name)
    base_name = name.strip("_").upper()
    if not base_name:
        base_name = "COL"
    
    final_name = base_name
    counter = 1
    while final_name in existing_names:
        final_name = f"{base_name}_{counter}"
        counter += 1
        
    existing_names.append(final_name)
    return final_name
