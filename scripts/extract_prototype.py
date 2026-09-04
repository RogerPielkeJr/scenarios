#!/usr/bin/env python3
"""One-time capture of the numeric constants embedded in the prototype
(prototype/kaya_scenario_builder.html) into JSON.

The CMIP7 marker series, the SSP population curves and the emulator fit
exist nowhere else on this machine -- they came into the prototype from
ScenarioMIP/IIASA and were never written to a source file here. This
script lifts them out verbatim so they can live in src/data/ and be
diffed, rather than being retyped. It is not part of the routine data
build (scripts/build_data.py regenerates everything that CAN be
regenerated from primary sources); it exists so the provenance of the
carried-over numbers is a script and not a memory.

Run: python3 scripts/extract_prototype.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'prototype' / 'kaya_scenario_builder.html'
OUT = ROOT / 'scripts' / '_prototype_constants.json'


def grab_json_literal(text: str, name: str) -> object:
    """Pull `const <name>={...};` or `=[...];` and JSON-parse it."""
    m = re.search(r'const\s+' + re.escape(name) + r'\s*=\s*(\{.*?\}|\[.*?\])\s*;\s*\n', text, re.S)
    if not m:
        raise SystemExit(f'could not find literal for {name}')
    return json.loads(m.group(1))


def js_to_json(body: str) -> str:
    """Quote bare object keys and pad bare-leading-dot decimals (`.1`, `-.5`),
    both of which are legal JS and illegal JSON."""
    body = re.sub(r'([{,\s])([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', body)
    body = re.sub(r'(?<=[:,\[\s])(-?)\.(\d)', r'\g<1>0.\2', body)
    return body


def grab_js_object(text: str, name: str) -> dict:
    """Pull a JS object literal with bare keys (BASE, OBS, MKPOP, MKRATE)."""
    m = re.search(r'const\s+' + re.escape(name) + r'\s*=\s*(\{.*?\})\s*;\s*\n', text, re.S)
    if not m:
        raise SystemExit(f'could not find object for {name}')
    return json.loads(js_to_json(m.group(1)))


def main() -> None:
    text = SRC.read_text()
    out = {
        'D': grab_json_literal(text, 'D'),
        'BASE': grab_js_object(text, 'BASE'),
        'OBS': grab_js_object(text, 'OBS'),
        'MKPOP': grab_js_object(text, 'MKPOP'),
        'MKRATE': grab_js_object(text, 'MKRATE'),
    }
    # CTRL and PRE are arrays of objects with bare keys and string labels.
    for name in ('CTRL', 'PRE'):
        m = re.search(r'const\s+' + name + r'\s*=\s*(\[.*?\])\s*;\s*\n', text, re.S)
        if not m:
            raise SystemExit(f'could not find array {name}')
        out[name] = json.loads(js_to_json(m.group(1)))
    # Marker warming table MT lives inline inside draw().
    m = re.search(r'const\s+MT\s*=\s*(\[.*?\])\s*;', text, re.S)
    if not m:
        raise SystemExit('could not find MT')
    out['MT'] = json.loads(m.group(1))

    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
    d = out['D']
    print(f'markers      {len(d["markers"])}  keys={sorted(d["markers"])}')
    print(f'marker years {len(d["years"])}  {d["years"][0]}-{d["years"][-1]}')
    print(f'countries    {len(d["countries"])}')
    print(f'ssp curves   {sorted(d["popcurves"])}')
    print(f'controls     {[c["id"] for c in out["CTRL"]]}')
    print(f'presets      {len(out["PRE"])}')
    print(f'wrote {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
