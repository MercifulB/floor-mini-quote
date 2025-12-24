import os
import shutil
import kagglehub

def main():
    path = kagglehub.dataset_download("bayramakgl/furnishing-dataset")
    print("Downloaded to:", path)

    out_dir = os.path.abspath("cv_training/data/furnishing-dataset")
    os.makedirs(out_dir, exist_ok=True)

    # Copy the dataset folder into your repo training area for consistency
    # This is optional, you can also keep using `path` directly
    if os.path.isdir(path):
        for name in os.listdir(path):
            src = os.path.join(path, name)
            dst = os.path.join(out_dir, name)
            if os.path.isdir(src):
                if os.path.exists(dst):
                    shutil.rmtree(dst)
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)

    print("Copied to:", out_dir)

if __name__ == "__main__":
    main()
