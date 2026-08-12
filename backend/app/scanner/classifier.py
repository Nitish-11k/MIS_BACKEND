from app.scanner.structure_detector import detect_structure

def classify(profile, metadata, delimiter_results):
    candidates = []

    # 1. Check delimiter results
    for delimiter, result in delimiter_results.items():
        if result["confidence"] >= 0.70:
            candidates.append({
                "type": "DELIMITED",
                "format": "DELIMITED",
                "delimiter": delimiter,
                "confidence": result["confidence"],
                "reason": f"Delimiter '{delimiter}' found consistently"
            })

    # 2. Check structure results
    structure = detect_structure(profile)
    if structure["confidence"] >= 0.70:
        candidates.append({
            "type": structure["type"],
            "format": structure["type"],
            "confidence": structure["confidence"],
            "reason": f"Structure matched {structure['type']}"
        })

    # Find the best candidate based on confidence
    if candidates:
        best_candidate = max(candidates, key=lambda x: x["confidence"])
    else:
        best_candidate = {
            "type": "UNKNOWN",
            "format": "UNKNOWN",
            "confidence": 0.0,
            "reason": "No clear structure or delimiter detected"
        }
        
    report_id = metadata.get("REPORT_ID")
    
    # Increase confidence if we have a known REPORT_ID (just a simple bump for now)
    if report_id:
        best_candidate["report_id"] = report_id
        if best_candidate["type"] != "UNKNOWN":
            best_candidate["confidence"] = min(1.0, best_candidate["confidence"] + 0.1)
            best_candidate["reason"] += f", and REPORT_ID {report_id} detected"
            
    # Set status
    if best_candidate["confidence"] >= 0.85:
        best_candidate["status"] = "READY"
    elif best_candidate["confidence"] >= 0.5:
        best_candidate["status"] = "REVIEW"
    else:
        best_candidate["status"] = "UNKNOWN"

    return best_candidate