import os
import gzip
from app.parser.metadata import extract_metadata
from app.parser.registry import REGISTRY

target_dir = r"C:\Users\dell\Desktop\MIS_TOOL\20250425\20250425\00001"
all_files = [f for f in os.listdir(target_dir) if f.endswith('.txt') or f.endswith('.txt.gz')]

unparsed_files = []
parsed_files = []

for filename in all_files:
    filepath = os.path.join(target_dir, filename)
    try:
        if filename.endswith('.gz'):
            with gzip.open(filepath, 'rt', encoding='utf-8', errors='replace') as f:
                content = f.read(2048)
        else:
            with open(filepath, 'rt', encoding='utf-8', errors='replace') as f:
                content = f.read(2048)
                
        lines = content.split('\n')
        metadata = extract_metadata(lines)
        report_id = metadata.get("REPORT_ID")
        
        # some hardcoded mapping logic check
        if report_id in REGISTRY:
            parsed_files.append((filename, report_id))
            continue
            
        if "CUSTOMER_MEMBER" in filename.upper():
            parsed_files.append((filename, "customer_member"))
            continue
            
        if "SHADOW" in filename.upper():
            parsed_files.append((filename, "shadow_file"))
            continue
            
        unparsed_files.append((filename, report_id))
    except Exception as e:
        unparsed_files.append((filename, f"ERROR: {e}"))

print(f"Total files: {len(all_files)}")
print(f"Parsed files: {len(parsed_files)}")
print(f"Unparsed files: {len(unparsed_files)}")
print("\nUnparsed Files List:")
for f, r in unparsed_files:
    print(f"  {f} (Report ID: {r})")
