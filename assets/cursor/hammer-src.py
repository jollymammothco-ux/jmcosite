#!/usr/bin/env python3
"""Generate the hammer cursor art.

A claw hammer, drawn the way clip art draws one: steel head, flat striking
face, waisted neck, a claw sweeping back off the eye, wood handle.

The claw is the whole point and it is also what went wrong twice. A claw is
not a hook. It sweeps back roughly a quarter turn and tapers to blunt points;
it does not curl round into a closed spiral, which is what the first two
passes drew and why they read as a bottle opener at 48px. The feature that
actually makes a hammer legible this small is the C-shaped gap between the
claw tips and the handle -- that negative space is the silhouette. Everything
here is sized to keep that gap open at 48px: CLAW_GAP is measured after
layout and asserted, because if it closes the drawing stops being a hammer.

Local frame: the head bar runs vertically with the striking face at the BOTTOM
(max y) and the butt at the top (y=0). The handle runs out along +x from the
eye. Each pose then places and rotates that.

Both poses are measured and fitted to the 48x48 canvas together, under one
shared transform, so they stay in register: the cursor hotspot must be the
same pixel in both or the pointer jumps when the button is pressed.

    python3 assets/cursor/hammer-src.py

writes hammer-up.svg and hammer-down.svg next to itself and prints the
hotspot, which has to match the two `cursor:` rules in styles.css.

The PNG fallbacks are rasterised from those SVGs with headless Chrome
(cairosvg has no libcairo here, and ImageMagick has no Freetype):

    printf '<!DOCTYPE html><html><head><style>html,body{margin:0;background:transparent}
    img{display:block;width:48px;height:48px}</style></head>
    <body><img src="hammer-up.svg"></body></html>' > shot.html
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \\
      --disable-gpu --default-background-color=00000000 --window-size=48,48 \\
      --screenshot=hammer-up.png http://localhost:PORT/shot.html

Chrome needs the file over http, not file://, or the <img> is blocked.
Bump the ?v= on all four cursor URLs in styles.css after any redraw: the
filenames do not change, so a new styles.css alone will not evict the old
art from anyone's cache.
"""
import math, os, re

OUT = os.path.dirname(os.path.abspath(__file__))
CANVAS = 48.0
MARGIN = 1.6          # room for the outline stroke

# ---------------------------------------------------------------- geometry
# Head half-widths down the bar, top of the cheek -> face. The claw is a
# separate shape that overlaps this block and merges with it.
HEAD = [
    (7.6,  5.5),   # top of the cheek, where the claw root merges in
    (12.0, 5.8),   # eye block: the mass the handle passes through
    (14.4, 5.5),
    (15.8, 4.4),   # shoulder steps in
    (17.8, 4.0),   # neck waist
    (19.0, 6.4),   # face flange flares back out
    (21.4, 6.1),   # striking face
]
FACE_Y = 21.4

# The claw. Seen from the side -- which is all a cursor ever shows -- a claw
# is a tapering prong that leans back off the eye and curves GENTLY. It is not
# a curl. The fork is a split across the width of the prong, so it is edge-on
# and invisible in profile; drawing the split as a notch in the silhouette is
# what turned the first attempts into a bottle opener. Two passes died on this:
# ~150 degrees of arc reads as a candy cane, and closing it further reads as a
# padlock shackle. This one turns about 35 degrees, root to tip.
CLAW_TIP = (3.0, -1.6)
CLAW = f"""M -5.5,9.4
  C -5.6,3.6 -4.0,-1.0 -0.4,-4.2
  L {CLAW_TIP[0]},{CLAW_TIP[1]}
  C 1.4,0.2 0.6,3.4 0.9,9.4 Z"""
# The split, hinted as a shadow line down the prong rather than cut out of it.
CLAW_SPLIT = "M -1.8,-2.6 C -1.0,0.8 -1.4,4.4 -1.2,8.0"

# Handle: through the eye, out along +x. (x, y_top, y_bottom)
HANDLE = [
    (2.2,  9.4, 15.0),
    (9.5,  9.7, 14.9),
    (21.0, 10.4, 14.8),
    (25.5, 10.3, 15.4),   # grip swell
    (29.5, 10.7, 14.9),   # end of the handle
]
EYE_MID = 12.2
GRIP = (27.0, EYE_MID + 0.7)   # wrist pivot

# The gap between the claw tips and the top of the handle. This is the
# hammer's signature negative space; below ~2.6 local units the two outlines
# merge at 48px and the claw stops reading as a claw.
CLAW_GAP = HANDLE[1][1] - CLAW_TIP[1]
assert CLAW_GAP >= 2.6, f"claw gap collapsed to {CLAW_GAP:.2f}"

REST_TILT = -8.0      # handle rides a little above horizontal
SWING = 17.0          # lift for the raised pose, about the wrist
STROKE = 1.15

# ------------------------------------------------------------------- maths

def rot(p, a, c):
    r = math.radians(a)
    dx, dy = p[0] - c[0], p[1] - c[1]
    return (c[0] + dx * math.cos(r) - dy * math.sin(r),
            c[1] + dx * math.sin(r) + dy * math.cos(r))


def local_points():
    pts = [(-w, y) for y, w in HEAD] + [(w, y) for y, w in HEAD]
    for x, yt, yb in HANDLE:
        pts += [(x, yt), (x, yb)]
    # Claw: on-curve and control points both. Controls overshoot the true
    # bounds, which only ever buys extra margin, never a clipped tip.
    nums = [float(n) for n in re.findall(r"-?\d+\.?\d*", CLAW)]
    pts += list(zip(nums[0::2], nums[1::2]))
    return pts


def pose_points(raised, tx, ty):
    """Mirror, numerically, exactly what the SVG transform chain will do."""
    out = []
    g = rot(GRIP, REST_TILT, (0, FACE_Y))
    g = (g[0] + tx, g[1] + ty)
    for p in local_points():
        q = rot(p, REST_TILT, (0, FACE_Y))
        q = (q[0] + tx, q[1] + ty)
        if raised:
            q = rot(q, SWING, g)
        out.append(q)
    return out, g


def face_centre(raised, tx, ty):
    q = rot((0.0, FACE_Y), REST_TILT, (0, FACE_Y))
    q = (q[0] + tx, q[1] + ty)
    if raised:
        _, g = pose_points(raised, tx, ty)
        q = rot(q, SWING, g)
    return q


# ------------------------------------------------------------------- paths

def head_path():
    right = [f"{w:.2f},{y:.2f}" for y, w in reversed(HEAD)]
    left = [f"{-w:.2f},{y:.2f}" for y, w in HEAD]
    return "M " + " L ".join(right + left) + " Z"


def handle_path():
    top = [f"{x:.2f},{yt:.2f}" for x, yt, _ in HANDLE]
    bot = [f"{x:.2f},{yb:.2f}" for x, _, yb in reversed(HANDLE)]
    return "M " + " L ".join(top + bot) + " Z"


# --------------------------------------------------------------------- fit
TX, TY = 12.0, 30.0 - FACE_Y

allpts = pose_points(True, TX, TY)[0] + pose_points(False, TX, TY)[0]
xs = [p[0] for p in allpts]
ys = [p[1] for p in allpts]
w, h = max(xs) - min(xs), max(ys) - min(ys)
S = min(1.0, (CANVAS - 2 * MARGIN) / max(w, h))
OX = MARGIN + (CANVAS - 2 * MARGIN - w * S) / 2 - min(xs) * S
OY = MARGIN + (CANVAS - 2 * MARGIN - h * S) / 2 - min(ys) * S

fc = face_centre(False, TX, TY)
HOTSPOT = (fc[0] * S + OX, fc[1] * S + OY)


def svg(raised):
    g = pose_points(raised, TX, TY)[1]
    swing = f' transform="rotate({SWING},{g[0]:.2f},{g[1]:.2f})"' if raised else ""
    place = f"translate({TX:.2f},{TY:.2f}) rotate({REST_TILT},0,{FACE_Y})"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="steel" x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#f2f6fa"/>
      <stop offset="0.40" stop-color="#c2cbd5"/>
      <stop offset="0.74" stop-color="#8b95a1"/>
      <stop offset="1" stop-color="#626b77"/>
    </linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c08a44"/>
      <stop offset="0.5" stop-color="#8f5c22"/>
      <stop offset="1" stop-color="#5a3611"/>
    </linearGradient>
  </defs>
  <g transform="translate({OX:.2f},{OY:.2f}) scale({S:.4f})">
    <g{swing}>
      <g transform="{place}">
        <!-- Handle first: the head then covers where it enters the eye, so it
             reads as passing through rather than butting against. -->
        <path d="{handle_path()}" fill="url(#wood)" stroke="#14171c"
              stroke-width="{STROKE}" stroke-linejoin="round"/>
        <!-- Claw and head are two shapes that overlap. Stroking both would
             draw an outline along the seam between them, so they are stroked
             first and then re-filled without stroke: the exterior outline
             survives (half of it sits outside the fill) and the seam is
             painted out. -->
        <g stroke="#14171c" stroke-width="{STROKE}" stroke-linejoin="round">
          <path d="{CLAW}" fill="url(#steel)"/>
          <path d="{head_path()}" fill="url(#steel)"/>
        </g>
        <g stroke="none">
          <path d="{CLAW}" fill="url(#steel)"/>
          <path d="{head_path()}" fill="url(#steel)"/>
        </g>
        <path d="{CLAW_SPLIT}" fill="none" stroke="#5c6672" stroke-width="0.7"
              stroke-linecap="round" opacity="0.5"/>
        <!-- polished striking face: the brightest edge is the business end -->
        <path d="M -5.7,{FACE_Y - 2.7:.2f} L 5.7,{FACE_Y - 2.7:.2f} L 5.5,{FACE_Y - 0.35:.2f} L -5.5,{FACE_Y - 0.35:.2f} Z"
              fill="#f6fafd" opacity="0.95"/>
      </g>
    </g>
  </g>
</svg>
'''


for raised, name in ((True, "hammer-up"), (False, "hammer-down")):
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(svg(raised))

print(f"union bbox {w:.1f}x{h:.1f}  scale {S:.3f}")
print(f"HOTSPOT  {HOTSPOT[0]:.1f} {HOTSPOT[1]:.1f}  -> css: {round(HOTSPOT[0])} {round(HOTSPOT[1])}")
