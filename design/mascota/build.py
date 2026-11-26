"""Arma el SVG por capas del perrito (template de app-mascot) y una página de previsualización.
Uso: python build.py <ruta mascot.component.html> <ruta mascot.component.scss> [celdas-json]
Con STANDALONE=<ruta.svg> también escribe el SVG animado suelto (pantalla de carga: src/assets/images/mascota-animada.svg).
Con KEEP_RM=1 la vista previa respeta «reducir movimiento»."""
import re, sys, json
import numpy as np

PAL = ['#3e0402', '#f2b67a', '#c98e56', '#ffe4c5', '#4c7b76', '#e77178', '#e3b494']
P = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in PAL])

def snap(m):
    c = np.array([int(m.group(1)[i:i + 2], 16) for i in (1, 3, 5)])
    return 'fill="' + PAL[int(((P - c) ** 2).sum(1).argmin())] + '"'

def part(name, indent):
    txt = open(f'svg/{name}.txt').read()
    txt = re.sub(r'fill="(#[0-9a-f]{6})"', snap, txt)
    return '\n'.join(indent + l for l in txt.splitlines())

O, T, C, SH = PAL[0], PAL[1], PAL[3], PAL[2]
# Pata que saluda, dibujada en vector apuntando hacia abajo desde el hombro (0,0). En reposo va girada 22°.
LEG = f'''<g transform="translate(122 222)">
          <path fill="{T}" d="M-16-12C-16 14-17 40-17 50C-25 55-25 75-7 77L9 77C24 75 25 56 16 51C16 40 16 14 16-12C16-25-16-25-16-12Z"/>
          <path fill="none" stroke="{O}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" d="M-16 4C-16.5 25-17 40-17 50C-25 55-25 75-7 77L9 77C24 75 25 56 16 51C16 42 16 22 16 4"/>
          <path fill="none" stroke="{SH}" stroke-width="6" stroke-linecap="round" d="M9 12C10 26 10 36 9 46"/>
          <ellipse fill="{C}" cx="1" cy="66" rx="10" ry="6.5"/>
          <circle fill="{C}" cx="-9" cy="55.5" r="3"/><circle fill="{C}" cx="1" cy="53" r="3"/><circle fill="{C}" cx="11" cy="55.5" r="3"/>
        </g>'''

svg = f'''<svg class="pet" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <ellipse class="shadow" cx="171" cy="284" rx="110" ry="9.5" fill="{O}"/>
  <g class="dog">
    <g class="joy">
      <g class="breath">
        <g class="tail">
{part('cola', '          ')}
        </g>
        <g class="body">
{part('cuerpo', '          ')}
        </g>
        <g class="chest">
{part('pecho', '          ')}
        </g>
        <g class="head">
          <g class="head-pose">
            <g class="head-idle">
              <g class="ear-l">
{part('oreja_izq', '                ')}
              </g>
              <g class="ear-r">
{part('oreja_der', '                ')}
              </g>
{part('cabeza', '              ')}
              <g class="eye eye-l">
{part('ojo_izq', '                ')}
              </g>
              <g class="eye eye-r">
{part('ojo_der', '                ')}
              </g>
            </g>
          </g>
        </g>
        <g class="leg">
          {LEG}
        </g>
      </g>
    </g>
  </g>
</svg>
'''
html_out, scss_in = sys.argv[1], sys.argv[2]
header = '<!-- Perrito por capas: generado desde design/mascota (piezas del logo vectorizadas). No editar a mano. -->\n'
open(html_out, 'w', encoding='utf-8').write(header + svg)
print('svg bytes', len(svg))

import os
if os.environ.get('STANDALONE'):
    css0 = open(scss_in, encoding='utf-8').read()
    css0 = re.sub(r'/\*.*?\*/', '', css0, flags=re.S)
    css0 = re.sub(r':host\((.*?)\)(?=[\s{,])', r'.pet\1', css0).replace(':host', '.pet')
    css0 = re.sub(r'\s*\n\s*', '\n', css0).strip()
    lone = svg.replace('<svg class="pet"', '<svg class="pet intro pose-hello" width="300" height="300"', 1)
    lone = lone.replace(' aria-hidden="true" focusable="false">', '>\n<style>\n' + css0 + '\n</style>', 1)
    open(os.environ['STANDALONE'], 'w', encoding='utf-8').write(lone)
    print('standalone bytes', len(lone))

# ---- Previsualización: cada celda congela las animaciones en un instante ----
css = open(scss_in, encoding='utf-8').read()
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
import os
if not os.environ.get('KEEP_RM'): css = css.replace('@media (prefers-reduced-motion: reduce)', '@media (max-width: 1px)')
css = re.sub(r':host\((.*?)\)(?=[\s{,])', r'.host\1', css).replace(':host', '.host')
cells = json.loads(sys.argv[3]) if len(sys.argv) > 3 else []
body = ''
for c in cells:
    body += f'<div class="cell"><div class="host {c["cls"]}" data-t="{c["t"]}">{svg}</div><p>{c["label"]}</p></div>'
page = f'''<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;background:#fff;font:12px sans-serif;display:flex;flex-wrap:wrap;}}
.cell{{width:200px;padding:6px;}} .cell p{{margin:2px;text-align:center}}
.host.host{{width:180px;height:180px;background:#FFC970;border-radius:12px;padding:10px;box-sizing:content-box;overflow:hidden}}
{css}</style></head><body>{body}
<script>
document.querySelectorAll('.host').forEach(h=>{{const t=+h.dataset.t;h.getAnimations({{subtree:true}}).forEach(a=>{{a.pause();a.currentTime=t;}});}});
</script></body></html>'''
open('preview.html', 'w', encoding='utf-8').write(page)
