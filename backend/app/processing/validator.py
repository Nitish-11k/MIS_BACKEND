def validate_record(record, schema=None):
    """
    Validates a normalized record.
    Returns (is_valid, errors_list)
    """
    errors = []
    
    if not record:
        return False, ["Record is empty"]
        
    if schema:
        # If a schema is provided, we would validate against it here.
        # For example, checking required fields, data types, etc.
        for field, rules in schema.items():
            value = record.get(field)
            if rules.get("required") and value is None:
                errors.append(f"Field '{field}' is required but missing")
            # add type checks if needed
                
    return len(errors) == 0, errors