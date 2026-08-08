import gzip
import shutil
import os
import sys

def extract_gz_to_txt(gz_filepath, output_dir=None):
    if not gz_filepath.endswith(".gz"):
        print("Error: Input file must end with .gz")
        return None
        
    if output_dir is None:
        output_dir = os.path.dirname(gz_filepath)
        
    os.makedirs(output_dir, exist_ok=True)
    
    # Extract the original filename without .gz
    base_name = os.path.basename(gz_filepath)
    txt_filename = base_name[:-3]
    output_filepath = os.path.join(output_dir, txt_filename)
    
    print(f"Extracting {gz_filepath} to {output_filepath}...")
    
    try:
        with gzip.open(gz_filepath, 'rb') as f_in:
            with open(output_filepath, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        print("Extraction complete!")
        return output_filepath
    except Exception as e:
        print(f"Failed to extract file: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m exporter.extract <path_to_gz_file> [output_directory]")
    else:
        gz_file = sys.argv[1]
        out_dir = sys.argv[2] if len(sys.argv) > 2 else None
        extract_gz_to_txt(gz_file, out_dir)
