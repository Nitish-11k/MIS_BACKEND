def get_column_indices_from_dashes(dash_line, header_lines=None):
    """
    Returns a list of tuples (start, end) representing the boundaries of columns.
    First tries to use spaces in the dash_line.
    If the dash_line is solid, it uses the header_lines to infer boundaries based on 
    either '|' delimiters or 2+ spaces separating text blocks.
    """
    # 1. Try to use spaces in dash line
    dash_line = dash_line.rstrip()
    if ' ' in dash_line.strip():
        indices = []
        in_dash = False
        start = 0
        
        for i, c in enumerate(dash_line):
            if c == '-' and not in_dash:
                in_dash = True
                start = i
            elif c != '-' and in_dash:
                in_dash = False
                indices.append((start, i))
                
        if in_dash:
            indices.append((start, len(dash_line)))
            
        expanded = []
        for i, (s, e) in enumerate(indices):
            if i < len(indices) - 1:
                next_s = indices[i+1][0]
                expanded.append((s, next_s))
            else:
                expanded.append((s, 999))
                
        if len(expanded) > 1:
            return expanded
            
    # 2. If solid dash line, use header lines
    if header_lines:
        # Check if '|' is used in the line right above the dashes
        last_header = header_lines[-1]
        if '|' in last_header:
            indices = []
            start = 0
            for i, c in enumerate(last_header):
                if c == '|':
                    indices.append((start, i + 1))
                    start = i + 1
            indices.append((start, 999))
            # Remove empty/trailing bounds
            indices = [(s, e) for s, e in indices if s < len(last_header.rstrip())]
            if len(indices) > 1:
                return indices
                
        # 3. Fallback: use 2+ spaces in the last header to find boundaries
        import re
        # Find all sequences of 2+ spaces
        matches = list(re.finditer(r' {2,}', last_header))
        if matches:
            indices = []
            start = 0
            for m in matches:
                # the end of the column is somewhere in the middle of the spaces
                # for safety, let's just make the boundary at the end of the spaces
                boundary = m.end() - 1 
                indices.append((start, boundary))
                start = boundary
            indices.append((start, 999))
            return indices
            
    # Fallback to single column
    return [(0, 999)]

if __name__ == "__main__":
    solid_dash = "-" * 100
    h1 = "      CASH          |     CLEARING       |     TRANSFER       | ACCOUNT NO  |"
    print("Pipe headers:", get_column_indices_from_dashes(solid_dash, [h1]))
    
    h2 = "          ACCOUNT    CUSTOMER NAME                             HOME  VALUE DATE"
    print("Space headers:", get_column_indices_from_dashes(solid_dash, [h2]))
