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
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist-single'


def read(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f'missing {path}; run `npm run build` first')
    return path.read_text()


def preview_links() -> dict[str, str]:
    """`--preview-link from=to` repoints links the page builds at runtime.

    `--rewrite` swaps a URL written into the markup. The links between pages
    of this site are built in JavaScript from the reader's current scenario,
    so no fixed string exists to swap. This appends a small script, for
    preview builds only, that repoints any anchor whose href starts with
    `from`. It runs once at load and again after each change, because the
    page rewrites those hrefs whenever a slider moves.
    """
    out = {}
    for i, arg in enumerate(sys.argv):
        if arg == '--preview-link' and i + 1 < len(sys.argv):
            frm, _, to = sys.argv[i + 1].partition('=')
            if not to:
                raise SystemExit('--preview-link needs from=to')
            out[frm] = to
    return out


def rewrites() -> dict[str, str]:
    """`--rewrite from=to` swaps a URL in the packed copy.

    The dashboard links to bibliography.html, which does not exist beside a
    single file. Point it at wherever that page actually lives instead.
    """
    out = {}
    for i, arg in enumerate(sys.argv):
        if arg == '--rewrite' and i + 1 < len(sys.argv):
            frm, _, to = sys.argv[i + 1].partition('=')
            if not to:
                raise SystemExit('--rewrite needs from=to')
            out[frm] = to
    return out


def main() -> None:
    page = 'main'
    for i, arg in enumerate(sys.argv):
        if arg == '--page' and i + 1 < len(sys.argv):
            page = sys.argv[i + 1]
    # Every entry point vite.config.ts builds, read from it rather than
    # repeated here, so a new page needs registering in one place only.
    config = (ROOT / 'vite.config.ts').read_text()
    sources = dict(re.findall(r"'?([\w-]+)'?: '([^']+\.html)'", config))
    if page not in sources:
        raise SystemExit(f'--page must be one of {", ".join(sources)}')
    source = sources[page]

    print(f'building {source} on its own...')
    subprocess.run(['npx', 'vite', 'build'], cwd=ROOT, check=True,
                   env={**os.environ, 'SINGLE_PAGE': page},
                   stdout=subprocess.DEVNULL)
    html = read(DIST / source)

    css_names = re.findall(r'<link rel="stylesheet"[^>]*href="/([^"]+\.css)"[^>]*>', html)
    js_names = re.findall(r'<script[^>]*src="/([^"]+\.js)"[^>]*></script>', html)
    if not css_names or not js_names:
        raise SystemExit(f'could not find the built CSS and JS in {source}')

    logo = base64.b64encode((DIST / 'thb-logo.png').read_bytes()).decode('ascii')
    logo_uri = f'data:image/png;base64,{logo}'
    # The logo is referenced from the markup as well as from the export code.
    html = html.replace('"/thb-logo.png"', f'"{logo_uri}"')

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

    for frm, to in rewrites().items():
        if frm not in html:
            raise SystemExit(f'--rewrite target not found in the page: {frm}')
        html = html.replace(f'"{frm}"', f'"{to}"')

    leftover = [m for m in re.findall(r'(?:src|href)="(/[^"]*)"', html)
                if not m.startswith('/#')]
    if leftover:
        raise SystemExit(f'still references files that will not exist: {leftover}')

    links = preview_links()
    if links:
        pairs = ','.join(f'[{frm!r},{to!r}]'.replace("'", '"') for frm, to in links.items())
        shim = (
            '\n<script>\n'
            '// Preview build only: the pages of this site link to each other by\n'
            '// path, and a single packed file has no siblings to link to. The\n'
            '// page rebuilds those hrefs whenever a slider moves, so an observer\n'
            '// repoints them again each time. The inequality guard stops the\n'
            '// observer retriggering itself.\n'
            '(function(){var m=[' + pairs + '];\n'
            'function fix(){var a=document.querySelectorAll("a[href]");\n'
            'for(var i=0;i<a.length;i++){var h=a[i].getAttribute("href");\n'
            'for(var j=0;j<m.length;j++){if(h.indexOf(m[j][0])===0&&h!==m[j][1]){\n'
            'a[i].setAttribute("href",m[j][1]);a[i].setAttribute("target","_blank");\n'
            'a[i].setAttribute("rel","noopener");}}}}\n'
            'new MutationObserver(fix).observe(document.documentElement,\n'
            '{childList:true,subtree:true,attributes:true,attributeFilter:["href"]});\n'
            'fix();window.addEventListener("load",fix);})();\n'
            '</script>\n')
        # Inside the body, so the wrapper-free copy carries it too.
        if '</body>' not in html:
            raise SystemExit('no </body> to put the preview shim before')
        html = html.replace('</body>', f'{shim}</body>', 1)

    suffix = '' if page == 'main' else f'-{page}'
    standalone = DIST / f'standalone{suffix}.html'
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
    (DIST / f'artifact-body{suffix}.html').write_text(keep + '\n' + body + '\n' + scripts)

    body_file = DIST / f'artifact-body{suffix}.html'
    print(f'{standalone.relative_to(ROOT)}  {standalone.stat().st_size / 1024:.0f} KB')
    print(f'{body_file.relative_to(ROOT)}  {body_file.stat().st_size / 1024:.0f} KB')


if __name__ == '__main__':
    main()
