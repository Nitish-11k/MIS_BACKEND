from app.parser.dispatcher import process_file

files = [
    r"C:\Users\dell\Desktop\MIS_TOOL\20250425\20250425\00001\gend1012.prt.txt.gz"
]

for f in files:
    try:
        print(f"Processing {f}...")
        process_file(f)
    except Exception as e:
        print(f"Error processing {f}: {e}")

print("Done.")
