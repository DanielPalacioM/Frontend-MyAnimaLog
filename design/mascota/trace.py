"""Vectoriza cada pieza (parts/*.png a 4x) y deja svg/<pieza>.txt con sus <path> en coordenadas de 1x (0..300)."""
import os, re, sys, vtracer

S = 4
PARTS = ['cola', 'cuerpo', 'pecho', 'oreja_izq', 'oreja_der', 'cabeza', 'ojo_izq', 'ojo_der']
os.makedirs('svg', exist_ok=True)
num = re.compile(r'-?\d+(?:\.\d+)?')

def fmt(v):
    s = f'{v:.1f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

def convert(d, tx, ty):
    out, toks, i = [], re.findall(r'[MLCZmlcz]|-?\d+(?:\.\d+)?', d), 0
    k = 0
    for t in toks:
        if t.isalpha():
            out.append(t); k = 0
        else:
            v = float(t) + (tx if k % 2 == 0 else ty)
            out.append(fmt(v / S)); k += 1
    s = ''
    for t in out:
        if t.isalpha(): s += t
        elif s and not s[-1].isalpha(): s += ' ' + t if not t.startswith('-') else t
        else: s += t
    return s

total = 0
for p in PARTS:
    tmp = f'svg/{p}.raw.svg'
    vtracer.convert_image_to_svg_py(f'parts/{p}.png', tmp, colormode='color', hierarchical='stacked', mode='spline',
                                    filter_speckle=10, color_precision=8, layer_difference=8, corner_threshold=70,
                                    length_threshold=20.0, max_iterations=10, splice_threshold=90, path_precision=0)
    raw = open(tmp).read()
    paths = []
    for m in re.finditer(r'<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})"(?: transform="translate\(([-\d.]+),([-\d.]+)\)")?', raw):
        d, fill = m.group(1), m.group(2).lower()
        tx, ty = float(m.group(3) or 0), float(m.group(4) or 0)
        paths.append(f'<path fill="{fill}" d="{convert(d, tx, ty)}"/>')
    txt = '\n'.join(paths)
    open(f'svg/{p}.txt', 'w').write(txt)
    total += len(txt)
    print(p, len(paths), 'paths', len(txt), 'bytes')
print('total', total)
