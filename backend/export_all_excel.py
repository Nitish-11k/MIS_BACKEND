import os
import pandas as pd
from pathlib import Path
from app.scanner.file_scanner import scan_files
from app.scanner.profiler import profile_file
from app.scanner.delimiter_detector import detect_delimiters
from app.parser.metadata import extract_metadata
from app.scanner.classifier import classify
from app.parser.registry import REGISTRY
from app.processing.normalizer import normalize_record
from app.parser.reader import read_report_lines

def export_all_successful_to_excel(input_folder, report_folder):
    os.makedirs(report_folder, exist_ok=True)
    files = scan_files(input_folder)
    
    print(f"Scanning {len(files)} files to find ones that can be parsed...")
    success_count = 0
    
    for file_info in files:
        filepath = file_info["filepath"]
        
        try:
            profile = profile_file(filepath)
            lines = profile.get("sample_lines", [])
            if not lines:
                continue
                
            metadata = extract_metadata(lines)
            delimiter_results = detect_delimiters(lines)
            classification = classify(profile, metadata, delimiter_results)
            
            # If our pipeline is highly confident it can parse it
            if classification.get("status") == "READY":
                report_id = classification.get("report_id")
                
                # And we have a registered parser for it
                if report_id and report_id in REGISTRY:
                    parse_func = REGISTRY[report_id]
                    all_lines = list(read_report_lines(filepath))
                    records = parse_func(all_lines)
                    
                    if records:
                        normalized_records = [normalize_record(r) for r in records]
                        df = pd.DataFrame(normalized_records)
                        output_path = Path(report_folder) / f"{Path(filepath).name}.xlsx"
                        
                        # Generate the excel file
                        df.to_excel(output_path, index=False)
                        print(f"[SUCCESS] Exported {output_path.name} -> {len(records)} records")
                        success_count += 1
                        
        except Exception as e:
            print(f"[ERROR] Failed on {Path(filepath).name}: {e}")
            
    print(f"\nDone! Exported {success_count} files to {report_folder}.")

if __name__ == "__main__":
    input_folder = "../data/incoming"
    report_folder = "../data/reports"
    export_all_successful_to_excel(input_folder, report_folder)
