"""Create the installable ZIP using only Python's standard library."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parent.parent
extension = root / "extension"
manifest = json.loads((extension / "manifest.json").read_text())
files = {path.relative_to(extension).as_posix(): path.read_bytes()
         for path in sorted(extension.rglob("*")) if path.is_file()}

def package(name, contents):
    destination = root / "dist" / name
    destination.parent.mkdir(exist_ok=True)
    with ZipFile(destination, "w", compression=ZIP_DEFLATED) as archive:
        for relative, data in sorted(contents.items()):
            archive.writestr(relative, data)
    with ZipFile(destination) as archive:
        assert archive.testzip() is None
        assert "manifest.json" in archive.namelist()
        for relative, data in contents.items():
            assert archive.read(relative) == data, relative
    print(destination)

package(f"ask-chatgpt-now-v{manifest['version']}.zip", files)

# The optional variant redirects Google/Bing search navigations while retaining
# the browser's existing default engine. It is a separate, opt-in installation.
variant = json.loads(json.dumps(manifest))
variant.pop("chrome_settings_overrides")
variant["name"] = "Ask ChatGPT Now (keep default)"
variant["description"] = "Keep your search engine setting. Redirect Google.com/Bing.com search pages to normal ChatGPT chat in the same tab."
variant["permissions"] = ["declarativeNetRequestWithHostAccess"]
variant["host_permissions"] = [
    "https://www.google.com/*", "https://google.com/*",
    "https://www.bing.com/*", "https://bing.com/*"
]
variant["declarative_net_request"] = {"rule_resources": [
    {"id": "search_redirects", "enabled": True, "path": "rules.json"}
]}
variant_files = dict(files)
variant_files["manifest.json"] = (json.dumps(variant, indent=2) + "\n").encode()
variant_files["rules.json"] = (root / "variants/keep-default/rules.json").read_bytes()
package(f"ask-chatgpt-now-keep-default-v{manifest['version']}.zip", variant_files)
