#!/usr/bin/env python3
"""Writes public/sitemap.xml from the pages vite actually builds.

The sitemap was a hand-kept file and went stale the moment a page was added:
it listed ten URLs while the site served twelve. vite.config.ts already names
every entry point, so that list is the one source worth reading.

404.html stays out: a sitemap lists pages worth indexing.

Run: python3 scripts/build_sitemap.py
"""
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://scenarios.thehonestbroker.org'
SKIP = {'404.html'}


def entries() -> list[str]:
    config = (ROOT / 'vite.config.ts').read_text()
    found = re.findall(r"'?[\w-]+'?:\s*'([^']+\.html)'", config)
    if not found:
        raise SystemExit('no page entries found in vite.config.ts')
    urls = []
    for path in found:
        if path in SKIP:
            continue
        # index.html at a directory root is served as the directory itself.
        pretty = path[:-len('index.html')] if path.endswith('index.html') else path
        urls.append(f'{SITE}/{pretty}')
    return urls


def main() -> None:
    today = date.today().isoformat()
    body = '\n'.join(
        f'  <url>\n    <loc>{url}</loc>\n    <lastmod>{today}</lastmod>\n  </url>'
        for url in entries())
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           f'{body}\n</urlset>\n')
    (ROOT / 'public' / 'sitemap.xml').write_text(xml)
    print(f'  wrote public/sitemap.xml with {len(entries())} URLs')
    for u in entries():
        print(f'    {u}')


if __name__ == '__main__':
    main()
