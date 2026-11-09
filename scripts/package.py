"""Create the installable ZIP using only Python's standard library."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parent.parent
extension = root / "extension"
manifest = json.loads((extension / "manifest.json").read_text())
destination = root / "dist" / f"ask-chatgpt-now-v{manifest['version']}.zip"
destination.parent.mkdir(exist_ok=True)
with ZipFile(destination, "w", compression=ZIP_DEFLATED) as archive:
    for path in sorted(extension.rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(extension))
with ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert "manifest.json" in archive.namelist()
print(destination)
