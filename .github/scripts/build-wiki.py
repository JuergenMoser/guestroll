"""Builds the GitHub wiki from docs/, so the documentation lives in one place.

usage: build-wiki.py <repository> <wiki checkout>

The wiki shows the docs of the latest release. Every page of the website becomes a wiki
page; links between pages are rewritten to wiki links, links to the rest of the repository
point at GitHub, and the wiki gets a home page, a sidebar and a footer.

Older releases keep their docs too, as pages named after the version (v0.3.0-Getting-Started),
listed on the Versions page. Pages no release has anymore are removed.
"""
import pathlib
import re
import subprocess
import sys

REPO = 'https://github.com/achedon12/guestroll'
SITE = 'https://achedon12.github.io/guestroll'

# docs file -> (wiki page, sidebar title), in sidebar order
PAGES = {
    'getting-started.md': ('Getting-started', 'Getting started'),
    'admin-guide.md': ('Admin-guide', 'Admin guide'),
    'customization.md': ('Customization', 'Customization'),
    'deployment.md': ('Deployment', 'Deployment'),
    'configuration.md': ('Configuration', 'Configuration'),
    'security.md': ('Security', 'Security'),
    'api.md': ('HTTP-API', 'HTTP API'),
    'architecture.md': ('Architecture', 'Architecture'),
    'development.md': ('Development', 'Development'),
    'design-prompt.md': ('Design-prompt', 'Design notes'),
}
GUIDE = ['getting-started.md', 'admin-guide.md', 'customization.md', 'deployment.md', 'configuration.md', 'security.md']
REFERENCE = ['api.md', 'architecture.md', 'development.md', 'design-prompt.md']

LINK = re.compile(r'\]\(([^)\s]+)\)')


class Version:
    """The docs of one release, as wiki pages."""

    def __init__(self, repository: pathlib.Path, tag: str, latest: str):
        self.repository = repository
        self.tag = tag
        self.latest = tag == latest
        self.latest_tag = latest
        self.files = [f for f in PAGES if self.read(f) is not None]

    def read(self, file: str) -> str | None:
        result = subprocess.run(['git', 'show', f'{self.tag}:docs/{file}'], cwd=self.repository, capture_output=True, text=True)
        return result.stdout if result.returncode == 0 else None

    def page(self, file: str) -> str:
        """The wiki page of a docs file in this version."""
        return PAGES[file][0] if self.latest else f'{self.tag}-{PAGES[file][0]}'

    def home(self) -> str:
        return 'Home' if self.latest else self.tag

    def site(self) -> str:
        return f'{SITE}/' if self.latest else f'{SITE}/{self.tag}/'

    def rewrite_link(self, target: str) -> str:
        if re.match(r'^[a-z]+:', target) or target.startswith('#'):
            return target
        path, _, anchor = target.partition('#')
        suffix = f'#{anchor}' if anchor else ''
        name = path.split('/')[-1]
        if not name.endswith('.md') and f'{name}.md' in PAGES:
            name += '.md'
        if name in self.files:
            return self.page(name) + suffix
        if path.startswith('/'):                       # a file of the website's public/ folder
            return f'{SITE}{path}{suffix}'
        clean = re.sub(r'^(\./)?(\.\./)+', '', path)  # relative to docs/: point at the repository
        return f'{REPO}/blob/{self.tag}/{clean}{suffix}'

    def notice(self, file: str) -> str:
        """The line at the top of each page, saying which version it documents."""
        if self.latest:
            return f'> 📚 Documentation of Guestroll **{self.tag}**, the latest release · [Other versions](Versions)\n\n'
        latest_page = PAGES[file][0]
        return (f'> ⚠️ Documentation of Guestroll **{self.tag}**. The latest release is {self.latest_tag}: '
                f'[this page in {self.latest_tag}]({latest_page}) · '
                f'[what changed]({REPO}/compare/{self.tag}...{self.latest_tag}) · [other versions](Versions)\n\n')

    def convert(self, file: str) -> str:
        markdown = self.read(file) or ''
        markdown = re.sub(r'\A---\n.*?\n---\n+', '', markdown, flags=re.S)   # website-only metadata
        markdown = re.sub(r'\A# .*\n+', '', markdown)   # the wiki shows the page name as its title
        markdown = containers(markdown)
        return self.notice(file) + LINK.sub(lambda m: f']({self.rewrite_link(m.group(1))})', markdown)

    def index(self) -> str:
        """The home page of an older version."""
        def items(files):
            return '\n'.join(f'- **[{PAGES[f][1]}]({self.page(f)})**' for f in files if f in self.files)

        return f"""> ⚠️ Documentation of Guestroll **{self.tag}**. The latest release is [{self.latest_tag}](Home) · [what changed]({REPO}/compare/{self.tag}...{self.latest_tag}) · [other versions](Versions)

## Guide

{items(GUIDE)}

## Reference

{items(REFERENCE)}

The same pages on the website, with search: {self.site()}
"""


def releases(repository: pathlib.Path) -> list[str]:
    """Release tags that have documentation, newest first."""
    def git(*args: str) -> str:
        return subprocess.run(['git', *args], cwd=repository, check=True, capture_output=True, text=True).stdout

    tags = [t for t in git('tag', '--list', 'v*').split() if re.fullmatch(r'v\d+\.\d+\.\d+', t)]
    tags = [t for t in tags if git('ls-tree', '--name-only', f'{t}:docs').strip()]
    return sorted(tags, key=lambda t: tuple(int(n) for n in t[1:].split('.')), reverse=True)


def containers(markdown: str) -> str:
    """VitePress ::: warning blocks become blockquotes, which GitHub renders."""
    out, inside = [], False
    for line in markdown.split('\n'):
        match = re.match(r'^::: *(\w+) *(.*)$', line)
        if match and not inside:
            inside = True
            out.append(f'> **{match.group(2) or match.group(1).capitalize()}**')
            out.append('>')
        elif line.strip() == ':::' and inside:
            inside = False
        else:
            out.append(f'> {line}' if inside else line)
    return '\n'.join(out)


def home(version: Version) -> str:
    def items(files):
        return '\n'.join(f'- **[{PAGES[f][1]}]({PAGES[f][0]})**' for f in files)

    return f"""<p align="center">
  <img src="{REPO}/raw/develop/docs/assets/social.png" alt="Guestroll: every guest's photos, in one place" width="100%">
</p>

**Guestroll** is self-hosted QR-code photo sharing for weddings and parties: guests scan a QR
code, their phone's camera opens, and every photo lands in the hosts' private album. No app,
no account, one Docker command.

```bash
docker run -d --name guestroll -p 3000:3000 -v guestroll-data:/data \\
  -e ADMIN_PASSWORD='choose-a-long-password' -e PUBLIC_URL='https://photos.example.com' \\
  ghcr.io/achedon12/guestroll:latest
```

> 📚 This wiki documents Guestroll **{version.tag}**, the latest release. [Older versions](Versions)

## Guide

{items(GUIDE)}

## Reference

{items(REFERENCE)}

## Elsewhere

- 🌐 [Website]({SITE}/), the same documentation with search
- 🐳 [Docker Hub](https://hub.docker.com/r/achedon12/guestroll)
- 🎬 [The tour on YouTube](https://youtu.be/MEuvBB-wVI8)
- 📝 [Changelog]({REPO}/blob/develop/CHANGELOG.md)
"""


def versions_page(versions: list[Version]) -> str:
    rows = []
    for version in versions:
        label = f'**{version.tag}** (latest)' if version.latest else version.tag
        changes = '' if version.latest else f'[what changed since]({REPO}/compare/{version.tag}...{versions[0].tag})'
        rows.append(f'| {label} | [wiki]({version.home()}) | [website]({version.site()}) | [release notes]({REPO}/releases/tag/{version.tag}) | {changes} |')
    return f"""Every release keeps its documentation. The wiki and the [website]({SITE}/) show the latest one.
Once develop documents changes that are not released yet, the website also has them under
[next]({SITE}/next/).

| Version | Wiki | Website | Release | Changes |
| --- | --- | --- | --- | --- |
""" + '\n'.join(rows) + f"""

All the changes, version by version: [changelog]({REPO}/blob/develop/CHANGELOG.md).
"""


def sidebar() -> str:
    def items(files):
        return '\n'.join(f'- [{PAGES[f][1]}]({PAGES[f][0]})' for f in files)

    return f"""**[🏠 Home](Home)**

**Guide**

{items(GUIDE)}

**Reference**

{items(REFERENCE)}

**Links**

- [Website]({SITE}/)
- [Repository]({REPO})
- [Changelog]({REPO}/blob/develop/CHANGELOG.md)

**[📚 Other versions](Versions)**
"""


FOOTER = f"""This wiki is generated from [`docs/`]({REPO}/tree/develop/docs) at each release: edit the docs, not the wiki. · [Website]({SITE}/) · [Versions](Versions) · MIT License
"""


def main() -> None:
    repository, wiki = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    tags = releases(repository)
    versions = [Version(repository, tag, tags[0]) for tag in tags]
    expected = {'Home.md', '_Sidebar.md', '_Footer.md', 'Versions.md'}

    for version in versions:
        for file in version.files:
            (wiki / f'{version.page(file)}.md').write_text(version.convert(file))
            expected.add(f'{version.page(file)}.md')
        if not version.latest:
            (wiki / f'{version.home()}.md').write_text(version.index())
            expected.add(f'{version.home()}.md')

    (wiki / 'Home.md').write_text(home(versions[0]))
    (wiki / 'Versions.md').write_text(versions_page(versions))
    (wiki / '_Sidebar.md').write_text(sidebar())
    (wiki / '_Footer.md').write_text(FOOTER)

    for stale in wiki.glob('*.md'):
        if stale.name not in expected:
            stale.unlink()


if __name__ == '__main__':
    main()
