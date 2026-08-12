import sys
import pandas as pd
from app.parser.reader import read_report_lines
from app.parser.registry import REGISTRY
from app.processing.normalizer import normalize_record
from pathlib import Path

def export_to_excel(filepath, report_id):
    print(f"Reading file: {filepath}")
    lines = list(read_report_lines(filepath))
    
    parse_func = REGISTRY[report_id]
    print(f"Parsing using {report_id} parser...")
    
    records = parse_func(lines)
    print(f"Parsed {len(records)} records.")
    
    normalized_records = [normalize_record(r) for r in records]
    
    df = pd.DataFrame(normalized_records)
    
    output_path = Path("../data/reports") / f"{Path(filepath).name}.xlsx"
    df.to_excel(output_path, index=False)
    print(f"Excel file generated successfully at: {output_path}")

if __name__ == "__main__":
    filepath = "../data/incoming/20250425/00001/Irregular_excess_draw_lond2397CPC.txt.gz"
    report_id = "BR2397-01"
    
    try:
        export_to_excel(filepath, report_id)
    except ImportError as e:
        print("Please install pandas and openpyxl: pip install pandas openpyxl")
    except Exception as e:
        print(f"Error: {e}")
