def normalize_record(record):
    """
    Normalizes a single parsed record.
    - Trims outer whitespace from strings
    - Converts empty strings to None (or handles nulls consistently)
    - Preserves internal spaces
    """
    normalized = {}
    for key, value in record.items():
        if isinstance(value, str):
            # Trim only outer whitespace
            val = value.strip()
            # Consistent null handling
            if val == "":
                normalized[key] = None
            else:
                normalized[key] = val
        else:
            normalized[key] = value
            
    return normalized