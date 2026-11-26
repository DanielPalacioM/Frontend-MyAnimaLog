"""Separa el PNG del perrito (300x300) en piezas para animar. Trabaja a 4x (1200 px).
Salida: parts/<pieza>.png (RGBA, mismo lienzo, paleta exacta) y rest.png (recompuesto para comparar)."""
import os, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

S = 4
N = 300 * S
im = Image.open('src.png').convert('RGBA').resize((N, N), Image.LANCZOS)
a = np.array(im).astype(float)
PAL = np.array([[0x3e, 0x04, 0x02], [0xf2, 0xb6, 0x7a], [0xc9, 0x8e, 0x56], [0xff, 0xe4, 0xc5],
                [0x4c, 0x7b, 0x76], [0xe7, 0x71, 0x78], [0xe3, 0xb4, 0x94]], float)
OUT, TAN, SHADOW = 0, 1, 2
lab = ((a[..., None, :3] - PAL[None, None]) ** 2).sum(-1).argmin(-1)
lab[a[..., 3] < 128] = -1
outline = lab == OUT

def poly(pts):
    m = Image.new('L', (N, N), 0)
    ImageDraw.Draw(m).polygon([(x * S, y * S) for x, y in pts], fill=1)
    return np.array(m).astype(bool)

def near(mask, d):  # píxeles a menos de d (en px de 1x) de la máscara
    return ndi.distance_transform_edt(~mask) <= d * S

fill = lab > 0
cc, n = ndi.label(fill)
def comp_at(x, y): return cc[y * S, x * S]
seeds = {'head': (150, 60), 'lear': (30, 100), 'tongue': (155, 148), 'collar': (150, 188),
         'body': (160, 240), 'tail': (282, 232), 'hfoot': (88, 238)}
ids = {k: comp_at(*v) for k, v in seeds.items()}
assert all(ids.values()), ids
# componentes sueltos (brillos pequeños) → la pieza cuyo centro esté más cerca
cent = {k: np.array(ndi.center_of_mass(cc == i)) for k, i in ids.items()}
group = {k: (cc == i) for k, i in ids.items()}
for i in range(1, n + 1):
    if i in ids.values(): continue
    c = np.array(ndi.center_of_mass(cc == i))
    k = min(cent, key=lambda k: np.linalg.norm(cent[k] - c))
    group[k] |= cc == i
    print('suelto', i, '→', k, int((cc == i).sum()))

D = 11  # grosor del contorno (1x) que se queda cada pieza
parts = {}

# Oreja derecha: sale del componente de la cabeza, cortando por su trazo interior
rear_poly = poly([(186, -2), (302, -2), (302, 125), (246, 118), (238, 106), (230, 88), (220, 68),
                  (208, 52), (196, 42), (192, 28)])
head_fill = group['head'] | group['tongue']
head_side = head_fill & ~rear_poly
rear_fill = group['head'] & rear_poly
head_all = (head_fill | (outline & near(head_side, D)))
# los trazos del borde de la oreja (pegados a su relleno) van con la oreja, no con la cabeza
rear_out = outline & near(rear_fill, D)
head_all &= ~(rear_out & ~near(head_side, 6))
parts['oreja_der'] = rear_fill | rear_out

# Oreja izquierda
lear_fill = group['lear']
parts['oreja_izq'] = lear_fill | (outline & near(lear_fill, D))
head_all &= ~(lear_fill)
# el borde exterior de la oreja izquierda no es de la cabeza
head_all &= ~(outline & near(lear_fill, D) & ~near(head_side, 6))

# Ojos: trazos sueltos dentro de la cabeza, en las cajas de cada ojo
strokes, ns = ndi.label(outline & ~near(~head_fill & ~outline, 0.5))
eye_boxes = {'ojo_izq': (78, 84, 124, 122), 'ojo_der': (154, 58, 204, 96)}
lab2 = lab.copy()
for name, (x0, y0, x1, y1) in eye_boxes.items():
    m = np.zeros_like(outline)
    for i in range(1, ns + 1):
        cy, cx = ndi.center_of_mass(strokes == i)
        if x0 * S <= cx <= x1 * S and y0 * S <= cy <= y1 * S: m |= strokes == i
    assert m.any(), name
    m = near(m, 0.6) & (lab != -1) & ~(lab > 0) | m  # incluye el antialias del borde
    parts[name] = m
# en la cabeza, debajo de los ojos se pinta con el color de alrededor (relleno más cercano)
eyes = parts['ojo_izq'] | parts['ojo_der']
_, (iy, ix) = ndi.distance_transform_edt(~(head_fill & ~near(eyes, 0.3)), return_indices=True)
head_lab = lab.copy()
head_lab[eyes] = lab[iy[eyes], ix[eyes]]

# Cola (con una base extra que se esconde detrás del cuerpo para que no se abra al moverla)
tail_fill = group['tail']
tail = tail_fill | (outline & near(tail_fill, D))
tail_ext = poly([(234, 236), (256, 228), (262, 284), (236, 286)])
parts['cola'] = tail | tail_ext

# Cuerpo: tronco, collar y pie trasero, con su contorno
body_fill = group['body'] | group['hfoot'] | group['collar']
body = body_fill | (outline & near(body_fill, D))
body &= ~(outline & near(tail_fill, D) & ~near(body_fill, 5))
# Pata delantera que saluda: se recorta del cuerpo
leg_poly = poly([(106, 205), (124, 206), (140, 219), (141, 262), (128, 263), (120, 286), (79, 287),
                 (79, 264), (90, 256), (95, 249), (95, 230), (100, 214)])
parts['pecho'] = body & leg_poly
# En el cuerpo, donde estaba la pata queda pecho liso (color base, sin sombra)
body_lab = lab.copy()
chest = leg_poly & body_fill
yy, xx = np.mgrid[0:N, 0:N]
# Sin la pata queda el pecho (un óvalo liso) y debajo, sombra del piso
in_chest = ((xx / S - 124) / 27) ** 2 + ((yy / S - 226) / 40) ** 2 <= 1
body_lab[leg_poly & body & in_chest & (yy > 214 * S)] = TAN
body_lab[leg_poly & body & ~in_chest & (yy > 236 * S)] = OUT
parts['cuerpo'] = body
parts['cabeza'] = head_all

LAB = {k: lab for k in parts}
LAB['cabeza'] = head_lab
LAB['pecho'] = body_lab
LAB['cola'] = np.where(tail_ext & ~tail, SHADOW, lab)

os.makedirs('parts', exist_ok=True)
ORDER = ['cola', 'cuerpo', 'pecho', 'oreja_izq', 'oreja_der', 'cabeza', 'ojo_izq', 'ojo_der']
rest = np.zeros((N, N, 4), np.uint8)
for k in ORDER:
    m = parts[k] & (LAB[k] >= 0) | (parts[k] & (k == 'cola') & tail_ext)
    img = np.zeros((N, N, 4), np.uint8)
    img[m, :3] = PAL[np.clip(LAB[k][m], 0, None)].astype(np.uint8)
    img[m, 3] = 255
    Image.fromarray(img).save(f'parts/{k}.png')
    rest[m] = img[m]
    print(k, int(m.sum()))
Image.fromarray(rest).save('rest.png')
ref = np.zeros((N, N, 4), np.uint8); ok = lab >= 0
ref[ok, :3] = PAL[lab[ok]].astype(np.uint8); ref[ok, 3] = 255
Image.fromarray(ref).save('ref.png')
diff = (rest[..., 3] > 0) != ok
print('pixeles distintos', int(diff.sum()), 'de', int(ok.sum()))
dimg = np.zeros((N, N, 3), np.uint8) + 255
dimg[ok] = 200; dimg[diff & ok] = [255, 0, 0]; dimg[diff & ~ok] = [0, 0, 255]
Image.fromarray(dimg).resize((600, 600)).save('diff.png')
np.save('lab.npy', lab)
