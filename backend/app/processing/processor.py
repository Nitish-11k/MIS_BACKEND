import traceback
from app.scanner.profiler import profile_file
from app.scanner.delimiter_detector import detect_delimiters
from app.parser.metadata import extract_metadata
from app.scanner.classifier import classify
from app.parser.registry import REGISTRY
from app.processing.normalizer import normalize_record
from app.processing.validator import validate_record
from app.parser.reader import read_report_lines

def process_file(filepath):
    """
    Complete pipeline to process a single file safely.
    Returns a dictionary with processing results.
    """
    result = {
        "file": str(filepath),
        "status": "ERROR",
        "report_type": None,
        "format": None,
        "confidence": 0.0,
        "records": 0,
        "valid_records": 0,
        "invalid_records": 0,
        "errors": []
    }
    
    try:
        # 1. Profile and extract basic info
        profile = profile_file(filepath)
        lines = profile.get("sample_lines", [])
        
        if not lines:
            result["status"] = "ERROR"
            result["errors"].append("File is empty or contains no valid lines")
            return result
            
        # 2. Extract Metadata
        metadata = extract_metadata(lines)
        
        # 3. Detect Delimiters
        delimiter_results = detect_delimiters(lines)
        
        # 4. Classify
        classification = classify(profile, metadata, delimiter_results)
        
        result["report_type"] = classification.get("report_id", "UNKNOWN")
        result["format"] = classification.get("format", "UNKNOWN")
        result["confidence"] = classification.get("confidence", 0.0)
        result["status"] = classification.get("status", "UNKNOWN")
        
        # 5. Check if we should proceed with parsing
        if result["status"] != "READY":
            # Just return the classification, do not parse
            return result
            
        # 6. Select parser
        report_id = classification.get("report_id")
        if not report_id or report_id not in REGISTRY:
            # Maybe the parser is registered under a generic name or we don't have it
            result["status"] = "REVIEW"
            result["errors"].append(f"No parser found in REGISTRY for report_id: {report_id}")
            return result
            
        parse_func = REGISTRY[report_id]
        
        # 7. Parse, Normalize, Validate
        all_lines = list(read_report_lines(filepath)) # Assuming parser needs all lines, or modify to stream if parser supports it
        
        # For now, most parsers in this project might just take a list of lines. 
        # We should try calling the parse function.
        parsed_records = parse_func(all_lines)
        
        result["records"] = len(parsed_records)
        
        # 8. Normalize and Validate
        for i, raw_record in enumerate(parsed_records):
            normalized = normalize_record(raw_record)
            is_valid, errors = validate_record(normalized)
            
            if is_valid:
                result["valid_records"] += 1
            else:
                result["invalid_records"] += 1
                result["errors"].append({
                    "row": i,
                    "reason": "VALIDATION_FAILED",
                    "details": errors
                })
                
        result["status"] = "SUCCESS"
        
    except Exception as e:
        result["status"] = "ERROR"
        result["errors"].append(f"Exception during processing: {str(e)}")
        # Don't print stack trace to logs with banking data, but keep exception name
        result["errors"].append(traceback.format_exc())
        
    return result