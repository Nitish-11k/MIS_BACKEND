import csv
import os
import time
from pathlib import Path

from app.scanner.file_scanner import scan_files
from app.scanner.profiler import profile_file
from app.parser.metadata import extract_metadata
from app.scanner.delimiter_detector import detect_delimiters
from app.scanner.classifier import classify
from app.processing.processor import process_file


def run_classification_mode(input_folder, report_folder):
    """
    Classification-only mode.
    Scans files, profiles them, classifies them, and writes a report.
    Does NOT parse full files or insert to database.
    """
    os.makedirs(report_folder, exist_ok=True)
    report_path = Path(report_folder) / "file_classification.csv"
    
    files = scan_files(input_folder)
    
    with open(report_path, "w", newline="", encoding="utf-8") as csvfile:
        fieldnames = [
            "file_name", "file_path", "file_size", "report_id", 
            "branch_code", "branch_name", "process_date", 
            "detected_format", "detected_report_type", 
            "confidence", "status", "reason"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for file_info in files:
            filepath = file_info["filepath"]
            try:
                profile = profile_file(filepath)
                lines = profile.get("sample_lines", [])
                
                metadata = extract_metadata(lines)
                delimiter_results = detect_delimiters(lines)
                
                classification = classify(profile, metadata, delimiter_results)
                
                writer.writerow({
                    "file_name": file_info["filename"],
                    "file_path": file_info["filepath"],
                    "file_size": file_info["size_bytes"],
                    "report_id": metadata.get("REPORT_ID", ""),
                    "branch_code": metadata.get("BRANCH_CODE", ""),
                    "branch_name": metadata.get("BRANCH_NAME", ""),
                    "process_date": metadata.get("PROC_DATE", ""),
                    "detected_format": classification.get("format", ""),
                    "detected_report_type": classification.get("type", ""),
                    "confidence": f"{classification.get('confidence', 0):.2f}",
                    "status": classification.get("status", "UNKNOWN"),
                    "reason": classification.get("reason", "")
                })
            except Exception as e:
                writer.writerow({
                    "file_name": file_info["filename"],
                    "file_path": file_info["filepath"],
                    "file_size": file_info["size_bytes"],
                    "status": "ERROR",
                    "reason": f"Exception: {str(e)}"
                })


def run_bulk_processing(input_folder, report_folder):
    """
    Runs the full processing pipeline for all files in the input folder.
    Generates a batch report.
    """
    os.makedirs(report_folder, exist_ok=True)
    batch_id = int(time.time())
    report_path = Path(report_folder) / f"batch_report_{batch_id}.csv"
    
    files = scan_files(input_folder)
    
    summary = {
        "total_files": len(files),
        "successful": 0,
        "review": 0,
        "unknown": 0,
        "failed": 0,
        "total_records": 0,
        "valid_records": 0,
        "invalid_records": 0
    }
    
    results = []
    
    for file_info in files:
        start_time = time.time()
        result = process_file(file_info["filepath"])
        duration = time.time() - start_time
        
        result["duration"] = duration
        results.append(result)
        
        status = result["status"]
        if status == "SUCCESS":
            summary["successful"] += 1
        elif status == "REVIEW":
            summary["review"] += 1
        elif status == "UNKNOWN":
            summary["unknown"] += 1
        else:
            summary["failed"] += 1
            
        summary["total_records"] += result.get("records", 0)
        summary["valid_records"] += result.get("valid_records", 0)
        summary["invalid_records"] += result.get("invalid_records", 0)
        
    with open(report_path, "w", newline="", encoding="utf-8") as csvfile:
        fieldnames = [
            "file", "status", "report_type", "format", 
            "confidence", "records", "valid_records", 
            "invalid_records", "error", "processing_duration"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for r in results:
            errors_str = " | ".join([str(e) for e in r.get("errors", [])])
            writer.writerow({
                "file": r.get("file"),
                "status": r.get("status"),
                "report_type": r.get("report_type"),
                "format": r.get("format"),
                "confidence": f"{r.get('confidence', 0):.2f}",
                "records": r.get("records", 0),
                "valid_records": r.get("valid_records", 0),
                "invalid_records": r.get("invalid_records", 0),
                "error": errors_str[:1000], # truncate long error strings
                "processing_duration": f"{r.get('duration', 0):.2f}"
            })
            
    return summary
