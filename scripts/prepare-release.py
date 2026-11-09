"""Stage only the tagged ZIPs whose contents match a passing live-browser report."""
from hashlib import sha256
from io import BytesIO
import json
import os
from pathlib import Path
import re
import subprocess
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent


def tagged_file(tag, path):
    return subprocess.check_output(["git", "show", f"{tag}:{path}"], cwd=ROOT)


def stage():
    current_version = json.loads((ROOT / "extension/manifest.json").read_text())["version"]
    tag = os.environ.get("REQUESTED_TAG") or f"v{current_version}"
    if not re.fullmatch(r"v\d+\.\d+\.\d+(?:\.\d+)?", tag):
        raise ValueError("Release tag must be a version such as v3.0.0")
    manifest = json.loads(tagged_file(tag, "extension/manifest.json"))
    if tag != f"v{manifest['version']}":
        raise ValueError("Tag and tagged manifest version differ")

    destination = ROOT / "dist"
    destination.mkdir(exist_ok=True)
    # Keep this directory limited to the validated assets used by the upload step.
    if any(destination.iterdir()):
        raise ValueError("dist must be empty before staging a release")
    staged = {}
    for suffix, variant, report_path in (
        ("", "default-provider", "docs/verification/browser-results.json"),
        ("-keep-default", "keep-default", "docs/verification/browser-results-keep-default.json"),
    ):
        report = json.loads(tagged_file(tag, report_path))
        if (report.get("status") != "PASS"
                or report.get("version") != manifest["version"]
                or report.get("variant") != variant
                or report.get("environment") != "real-signed-out-chatgpt"
                or not report.get("tests")
                or any(test.get("status") != "PASS" for test in report["tests"])):
            raise ValueError(f"Missing passing live-browser evidence for {variant}")
        name = f"ask-chatgpt-now{suffix}-{tag}.zip"
        payload = tagged_file(tag, f"downloads/{name}")
        with ZipFile(BytesIO(payload)) as archive:
            names = archive.namelist()
            expected = report.get("extensionFilesSha256", {})
            if not expected or len(names) != len(set(names)) or set(names) != set(expected):
                raise ValueError(f"Archive entries differ from the tested files: {name}")
            if archive.testzip() is not None:
                raise ValueError(f"Corrupt archive: {name}")
            for entry, digest in expected.items():
                if sha256(archive.read(entry)).hexdigest() != digest:
                    raise ValueError(f"Untested content: {name}/{entry}")
            if json.loads(archive.read("manifest.json"))["version"] != manifest["version"]:
                raise ValueError(f"Archive version mismatch: {name}")
        staged[name] = payload

    for name, payload in staged.items():
        (destination / name).write_bytes(payload)
    checksums = "".join(f"{sha256(staged[name]).hexdigest()}  {name}\n" for name in sorted(staged))
    (destination / "SHA256SUMS.txt").write_text(checksums)
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as output:
            output.write(f"tag={tag}\n")
    print(f"Verified {tag}: {len(staged)} archives match the tagged live-browser reports")
    print(checksums, end="")


if __name__ == "__main__":
    stage()
