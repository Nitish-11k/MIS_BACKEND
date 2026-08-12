import re

def detect_structure(profile):
    """
    Detects if the structure is likely FIXED_WIDTH or WHITESPACE delimited.
    Checks line length consistency and whitespace runs.
    """
    min_len = profile.get("min_length", 0)
    max_len = profile.get("max_length", 0)
    lines = profile.get("sample_lines", [])

    is_fixed_width = False
    is_whitespace = False
    confidence = 0.0
    
    if not lines:
        return {"type": "UNKNOWN", "confidence": 0.0}

    # If min length is close to max length, it might be fixed width
    if min_len > 0 and max_len > 0 and (max_len - min_len) <= 2:
        is_fixed_width = True
        confidence = 0.8
        
        # Additional check: are there consistent runs of whitespace across lines?
        # We can look for positions that are always spaces.
        if len(lines) > 2:
            space_positions = set(range(min_len))
            for line in lines:
                current_spaces = {i for i, char in enumerate(line) if char == ' '}
                space_positions = space_positions.intersection(current_spaces)
                
            if len(space_positions) > 5:
                confidence = 0.95
    else:
        # Check for whitespace delimited
        # If there are multiple spaces separating words frequently
        whitespace_runs = 0
        for line in lines:
            if re.search(r'\s{2,}', line):
                whitespace_runs += 1
                
        if whitespace_runs / len(lines) > 0.5:
            # But not fixed width, so it might be whitespace delimited
            is_whitespace = True
            confidence = 0.7

    if is_fixed_width:
        return {"type": "FIXED_WIDTH", "confidence": confidence}
    elif is_whitespace:
        return {"type": "WHITESPACE", "confidence": confidence}
    
    return {"type": "UNKNOWN", "confidence": 0.0}
