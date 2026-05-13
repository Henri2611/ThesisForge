#!/usr/bin/env python3
"""Setup script for ThesisForge backend."""

import subprocess
import sys


def main():
    print("Creating virtual environment...")
    subprocess.run([sys.executable, "-m", "venv", ".venv"], check=True)

    pip = ".venv\\Scripts\\pip" if sys.platform == "win32" else ".venv/bin/pip"

    print("Installing dependencies...")
    subprocess.run([pip, "install", "-r", "requirements.txt"], check=True)

    print("\nSetup complete! Run the server with:")
    print("  .venv\\Scripts\\uvicorn main:app --reload   (Windows)")
    print("  .venv/bin/uvicorn main:app --reload         (Linux/Mac)")


if __name__ == "__main__":
    main()
