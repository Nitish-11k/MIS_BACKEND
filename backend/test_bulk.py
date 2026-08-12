from app.processing.bulk_processor import run_classification_mode, run_bulk_processing

if __name__ == "__main__":
    input_folder = "../data/incoming"
    report_folder = "../data/reports"
    
    print("Running classification mode...")
    run_classification_mode(input_folder, report_folder)
    print("Classification report generated at data/reports/file_classification.csv")
    
    print("Running bulk processing mode...")
    summary = run_bulk_processing(input_folder, report_folder)
    print("Bulk processing completed.")
    print(summary)
