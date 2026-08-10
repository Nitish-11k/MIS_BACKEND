import os
from app.parser.dispatcher import process_file

if __name__ == "__main__":
    base_dir = r"C:\Users\dell\Desktop\MIS_TOOL\20250425\20250425"
    
    # Process all directories in base_dir
    for branch_folder in os.listdir(base_dir):
        branch_path = os.path.join(base_dir, branch_folder)
        
        # Only process if it is a directory and looks like a branch code (e.g. 00001)
        if os.path.isdir(branch_path) and branch_folder.isdigit():
            print(f"Processing branch folder: {branch_folder}...")
            for filename in os.listdir(branch_path):
                if filename.endswith(".txt") or filename.endswith(".txt.gz"):
                    filepath = os.path.join(branch_path, filename)
                    process_file(filepath)