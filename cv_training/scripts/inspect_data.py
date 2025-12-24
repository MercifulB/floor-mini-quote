import os
from pathlib import Path

ROOT = Path("cv_training/data/furnishing-dataset")

def main():
    if not ROOT.exists():
        print("Dataset not found at", ROOT)
        return

    exts = {}
    for p in ROOT.rglob("*"):
        if p.is_file():
            exts[p.suffix.lower()] = exts.get(p.suffix.lower(), 0) + 1

    print("File extension counts:")
    for k in sorted(exts.keys()):
        print(k, exts[k])

    # Try to find typical annotation folders
    for name in ["labels", "annotations", "annot", "train", "valid", "val", "test", "images"]:
        matches = list(ROOT.rglob(name))
        if matches:
            print("Found:", name, "examples:", matches[:3])

if __name__ == "__main__":
    main()
