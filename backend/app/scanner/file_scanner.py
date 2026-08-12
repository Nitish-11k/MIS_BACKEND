from pathlib import Path
import os


SUPPORTED_EXTENSIONS = {".gz", ".txt"}


def scan_files(folder_path: str):
    folder = Path(folder_path)

    if not folder.exists():
        raise FileNotFoundError(f"Folder does not exist: {folder}")

    files = []

    for file in folder.rglob("*"):
        if not file.is_file():
            continue

        if file.suffix.lower() in SUPPORTED_EXTENSIONS:
            stat = file.stat()
            files.append({
                "filepath": str(file),
                "filename": file.name,
                "extension": file.suffix.lower(),
                "size_bytes": stat.st_size
            })

    return files