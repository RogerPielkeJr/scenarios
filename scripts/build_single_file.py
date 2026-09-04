#!/usr/bin/env python3
"""Packs the built site into one self-contained HTML file.

Useful for sending someone a working copy without a server: the CSS, the
JavaScript and the logo all end up inside the file. Run `npm run build`
first, then:

    python3 scripts/build_single_file.py

Writes two things:
  dist/standalone.html    a complete page, openable from the filesystem
  dist/artifact-body.html the same content without the html/head/body
                          wrapper, for hosts that supply their own

The only behaviour that differs from the served site is the chart download
in sandboxed hosts that block page-initiated downloads. Everything else,
including the URL-hash sharing, works the same.
"""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'


def read(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f'missing {path}; run `npm run build` first')
    return path.read_text()


def main() -> None:
    html = read(DIST / 'index.html')

    css_names = re.findall(r'<link rel="stylesheet"[^>]*href="/([^"]+\.css)"[^>]*>', html)
    js_names = re.findall(r'<script[^>]*src="/([^"]+\.js)"[^>]*></script>', html)
    if not css_names or not js_names:
        raise SystemExit('could not find the built CSS and JS in dist/index.html')

    logo = base64.b64encode((DIST / 'thb-logo.png').read_bytes()).decode('ascii')
    logo_uri = f'data:image/png;base64,{logo}'

    for name in css_names:
        css = read(DIST / name)
        html = re.sub(r'<link rel="stylesheet"[^>]*href="/' + re.escape(name) + r'"[^>]*>',
                      lambda _: f'<style>\n{css}\n</style>', html, count=1)

    for name in js_names:
        js = read(DIST / name)
        js = re.sub(r'//# sourceMappingURL=.*$', '', js, flags=re.M)
        js = js.replace('/thb-logo.png', logo_uri)
        # A literal </script> anywhere in the source would close the tag early.
        js = js.replace('</script', r'<\/script')
        html = re.sub(r'<script[^>]*src="/' + re.escape(name) + r'"[^>]*></script>',
                      lambda _: f'<script type="module">\n{js}\n</script>', html, count=1)

    if 'src="/' in html or 'href="/assets' in html:
        raise SystemExit('something still references an external file')

    standalone = DIST / 'standalone.html'
    standalone.write_text(html)

    # The wrapper-free version: everything the <head> carried that matters,
    # then the body content.
    head = html[html.index('<head>') + len('<head>'):html.index('</head>')]
    body = html[html.index('<body>') + len('<body>'):html.index('</body>')]
    # Vite emits the module script into <head>, so the wrapper-free version
    # has to carry it across too, after the body content rather than before
    # it, so the elements it wires up exist by the time it runs.
    keep = ''.join(re.findall(r'<title>.*?</title>|<link rel="stylesheet"[^>]*>|'
                              r'<link rel="preconnect"[^>]*>|<style>.*?</style>', head, re.S))
    scripts = ''.join(re.findall(r'<script[^>]*>.*?</script>', head, re.S))
    if '<script' not in scripts and '<script' not in body:
        raise SystemExit('no script survived into the wrapper-free version')
    (DIST / 'artifact-body.html').write_text(keep + '\n' + body + '\n' + scripts)

    print(f'dist/standalone.html      {standalone.stat().st_size / 1024:.0f} KB')
    print(f'dist/artifact-body.html   {(DIST / "artifact-body.html").stat().st_size / 1024:.0f} KB')


if __name__ == '__main__':
    main()
