"""Writes shields.io endpoint badges with fresh download counts.

usage: badges.py <output dir>

shields.io caches its Docker Hub badge for six hours and GitHub's for one; the
README reads these files instead, refreshed every hour by the Badges workflow,
with a five-minute cache.
"""
import json
import pathlib
import sys
import urllib.request

REPO = "achedon12/guestroll"
IMAGE = "achedon12/guestroll"


def get(url: str, headers: dict[str, str] | None = None):
    request = urllib.request.Request(url, headers={"User-Agent": "guestroll-badges", **(headers or {})})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def short(n: int) -> str:
    """1234 -> 1.2k, the way shields.io writes counts."""
    for limit, suffix in ((1_000_000_000, "G"), (1_000_000, "M"), (1_000, "k")):
        if n >= limit:
            value = n / limit
            return f"{value:.1f}".rstrip("0").rstrip(".") + suffix
    return str(n)


def badge(label: str, count: int) -> dict:
    # The same look as the other shields.io badges of the README.
    return {"schemaVersion": 1, "label": label, "message": short(count), "color": "blue"}


def main() -> None:
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    pulls = get(f"https://hub.docker.com/v2/repositories/{IMAGE}/")["pull_count"]
    releases = get(f"https://api.github.com/repos/{REPO}/releases?per_page=100", {"Accept": "application/vnd.github+json"})
    downloads = sum(asset["download_count"] for release in releases for asset in release["assets"])
    (out / "docker-pulls.json").write_text(json.dumps(badge("Docker Hub pulls", pulls)) + "\n")
    (out / "github-downloads.json").write_text(json.dumps(badge("GitHub downloads", downloads)) + "\n")
    print(f"Docker Hub pulls: {pulls}, GitHub downloads: {downloads}")


if __name__ == "__main__":
    main()
