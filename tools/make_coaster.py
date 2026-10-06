#!/usr/bin/env python3
"""
ORYZO-1 mesh generator.

Builds a cork-coaster mesh as a surface of revolution and writes it out as a
clean OBJ (+ MTL). Emits positions, texture coordinates and vertex normals.

Profile (meridian cross-section), traversed bottom-centre -> outward -> up over
the rim -> down into the dished well -> back to the centre:

      rim flat
   ___________
  /           \__  <- eased inner step down into the well
 |                \________________  well floor
 |                                 |
 |  outer wall                     |
  \_______________________________/   <- bottom face
       (bottom fillet)

Units are normalised so the outer radius is 1.0 (= 47 mm on the real object),
giving an 8 mm profile height at 94 mm diameter.
"""

import math
import os
import sys

R_OUTER = 1.0          # outer radius (1.0 unit == 47 mm)
HEIGHT = 0.170         # total profile height (8 mm / 47 mm)
FILLET_BOTTOM = 0.035  # convex fillet, bottom outer edge
FILLET_TOP = 0.045     # convex fillet, top outer edge
RIM_INNER = 0.880      # where the flat top rim ends
WELL_RADIUS = 0.830    # where the dished well floor begins
WELL_DEPTH = 0.030     # how far the well sits below the rim

SMOOTH_DEG = 50.0      # adjacent faces below this angle get averaged normals
EPS = 1e-9


def smoothstep(t):
    return t * t * (3.0 - 2.0 * t)


def build_profile(fillet_steps, step_steps):
    """Return the meridian profile as a list of (radius, height) points."""
    pts = [(0.0, 0.0), (R_OUTER - FILLET_BOTTOM, 0.0)]

    # bottom outer fillet: centre (R-rb, rb), sweeping -90deg -> 0deg
    cx, cy = R_OUTER - FILLET_BOTTOM, FILLET_BOTTOM
    for k in range(1, fillet_steps + 1):
        a = math.radians(-90.0 + 90.0 * k / fillet_steps)
        pts.append((cx + FILLET_BOTTOM * math.cos(a), cy + FILLET_BOTTOM * math.sin(a)))

    # outer wall, straight up to the start of the top fillet
    pts.append((R_OUTER, HEIGHT - FILLET_TOP))

    # top outer fillet: centre (R-rt, H-rt), sweeping 0deg -> 90deg
    cx, cy = R_OUTER - FILLET_TOP, HEIGHT - FILLET_TOP
    for k in range(1, fillet_steps + 1):
        a = math.radians(90.0 * k / fillet_steps)
        pts.append((cx + FILLET_TOP * math.cos(a), cy + FILLET_TOP * math.sin(a)))

    # flat top rim, inward
    pts.append((RIM_INNER, HEIGHT))

    # eased step down into the well (tangent-continuous at both ends)
    for k in range(1, step_steps + 1):
        t = k / step_steps
        r = RIM_INNER + (WELL_RADIUS - RIM_INNER) * t
        y = HEIGHT - WELL_DEPTH * smoothstep(t)
        pts.append((r, y))

    # well floor back to the axis
    pts.append((0.0, HEIGHT - WELL_DEPTH))

    # drop consecutive duplicates
    out = [pts[0]]
    for p in pts[1:]:
        if abs(p[0] - out[-1][0]) > 1e-12 or abs(p[1] - out[-1][1]) > 1e-12:
            out.append(p)
    return out


def seg_normal(a, b):
    """Outward meridian normal for the segment a->b, as (n_radial, n_y)."""
    dr, dy = b[0] - a[0], b[1] - a[1]
    n = (dy, -dr)
    m = math.hypot(*n)
    return (n[0] / m, n[1] / m)


def norm2(v):
    m = math.hypot(*v)
    return (v[0] / m, v[1] / m)


def build_rings(profile):
    """Collapse the profile into deduplicated rings plus the bands between them.

    A ring is (radius, height, n_radial, n_y, v) where v is the normalised
    arc-length coordinate used for texturing. Tangent-continuous joins share a
    ring (smooth shading); creases emit two rings with distinct normals.
    """
    segs = list(zip(profile[:-1], profile[1:]))
    normals = [seg_normal(a, b) for a, b in segs]

    # normalised arc length along the profile, per profile point
    lengths = [0.0]
    for a, b in segs:
        lengths.append(lengths[-1] + math.dist(a, b))
    total = lengths[-1]
    vcoord = [l / total for l in lengths]

    smooth_cos = math.cos(math.radians(SMOOTH_DEG))
    rings, index, bands = [], {}, []

    def add(point, normal, v):
        key = (round(point[0], 9), round(point[1], 9),
               round(normal[0], 7), round(normal[1], 7), round(v, 9))
        if key not in index:
            index[key] = len(rings)
            rings.append((point[0], point[1], normal[0], normal[1], v))
        return index[key]

    for i, (a, b) in enumerate(segs):
        n = normals[i]
        n_start, n_end = n, n
        if i > 0:
            prev = normals[i - 1]
            if prev[0] * n[0] + prev[1] * n[1] >= smooth_cos:
                n_start = norm2((prev[0] + n[0], prev[1] + n[1]))
        if i < len(segs) - 1:
            nxt = normals[i + 1]
            if n[0] * nxt[0] + n[1] * nxt[1] >= smooth_cos:
                n_end = norm2((n[0] + nxt[0], n[1] + nxt[1]))
        bands.append((add(a, n_start, vcoord[i]), add(b, n_end, vcoord[i + 1])))

    return rings, bands


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def build_mesh(profile, segments):
    """Revolve the profile, returning (positions, uvs, normals, faces).

    Faces are lists of (v_idx, vt_idx, vn_idx) triples, 0-based.
    Rings on the axis collapse to a single pole vertex with a triangle fan, so
    the mesh carries no degenerate quads.
    """
    rings, bands = build_rings(profile)

    cos_t = [math.cos(2.0 * math.pi * j / segments) for j in range(segments)]
    sin_t = [math.sin(2.0 * math.pi * j / segments) for j in range(segments)]

    positions, uvs, normals = [], [], []
    ring_v, ring_vn, ring_vt, is_pole = [], [], [], []

    for (r, y, nr, ny, v) in rings:
        pole = r <= EPS
        is_pole.append(pole)

        # texture coords: one column per segment boundary, so the seam closes
        ring_vt.append(len(uvs))
        for j in range(segments + 1):
            uvs.append((j / segments, v))

        if pole:
            ring_v.append(len(positions))
            positions.append((0.0, y, 0.0))
            ring_vn.append(len(normals))
            normals.append((0.0, 1.0 if ny > 0 else -1.0, 0.0))
        else:
            ring_v.append(len(positions))
            ring_vn.append(len(normals))
            for j in range(segments):
                positions.append((r * cos_t[j], y, r * sin_t[j]))
                normals.append((nr * cos_t[j], ny, nr * sin_t[j]))

    # Winding: order each face A[j] -> B[j] -> B[j+1] -> A[j+1], which is
    # counter-clockwise seen from outside. Pole bands collapse one side of that
    # quad to the single axis vertex, keeping the same orientation.
    faces = []
    for (ia, ib) in bands:
        for j in range(segments):
            j2 = (j + 1) % segments
            a_lo = (ring_v[ia] + j, ring_vt[ia] + j, ring_vn[ia] + j)
            a_hi = (ring_v[ia] + j2, ring_vt[ia] + j + 1, ring_vn[ia] + j2)
            b_lo = (ring_v[ib] + j, ring_vt[ib] + j, ring_vn[ib] + j)
            b_hi = (ring_v[ib] + j2, ring_vt[ib] + j + 1, ring_vn[ib] + j2)
            pole_a = (ring_v[ia], ring_vt[ia] + j, ring_vn[ia])
            pole_b = (ring_v[ib], ring_vt[ib] + j, ring_vn[ib])

            if is_pole[ia]:
                faces.append([pole_a, b_lo, b_hi])
            elif is_pole[ib]:
                faces.append([a_lo, pole_b, a_hi])
            else:
                faces.append([a_lo, b_lo, b_hi, a_hi])

    # Safety net: the signed volume of a closed mesh is positive only when the
    # winding is outward. Check globally rather than sampling a single face.
    if signed_volume(positions, faces) < 0:
        for f in faces:
            f.reverse()

    return positions, uvs, normals, faces


def signed_volume(positions, faces):
    """Signed volume via the divergence theorem; positive for outward winding."""
    total = 0.0
    for f in faces:
        p = [positions[t[0]] for t in f]
        for k in range(1, len(p) - 1):
            c = cross(p[k], p[k + 1])
            total += (p[0][0] * c[0] + p[0][1] * c[1] + p[0][2] * c[2]) / 6.0
    return total


def write_obj(path, positions, uvs, normals, faces, name, mtl, segments):
    def fmt(x):
        # trim float noise; keeps the file small and diffable
        return f"{0.0 if abs(x) < 5e-7 else x:.6f}".rstrip("0").rstrip(".")

    with open(path, "w") as f:
        f.write(f"# {name}\n")
        f.write("# Open-weight coaster model. Surface of revolution.\n")
        f.write("# Scale: 1 unit = 47 mm (94 mm diameter, 8 mm profile height).\n")
        f.write(f"# Radial segments: {segments}\n")
        f.write(f"# Vertices: {len(positions)}  Faces: {len(faces)}\n")
        f.write(f"mtllib {mtl}\n")
        f.write(f"o {name}\n")
        for p in positions:
            f.write(f"v {fmt(p[0])} {fmt(p[1])} {fmt(p[2])}\n")
        for t in uvs:
            f.write(f"vt {fmt(t[0])} {fmt(t[1])}\n")
        for n in normals:
            f.write(f"vn {fmt(n[0])} {fmt(n[1])} {fmt(n[2])}\n")
        f.write("usemtl cork\n")
        f.write("s 1\n")
        for face in faces:
            f.write("f " + " ".join(f"{v+1}/{vt+1}/{vn+1}" for v, vt, vn in face) + "\n")


MTL = """# ORYZO-1 material library
newmtl cork
Ka 0.100000 0.070000 0.040000
Kd 0.726000 0.541000 0.333000
Ks 0.030000 0.030000 0.030000
Ns 8.000000
Ni 1.000000
d 1.000000
illum 2
"""


def validate(positions, uvs, normals, faces):
    """Re-read the mesh we just built and assert it is well formed."""
    assert positions and uvs and normals and faces
    tri = quad = 0
    for f in faces:
        assert len(f) in (3, 4), f"unexpected face arity {len(f)}"
        tri += len(f) == 3
        quad += len(f) == 4
        for v, vt, vn in f:
            assert 0 <= v < len(positions), "vertex index out of range"
            assert 0 <= vt < len(uvs), "uv index out of range"
            assert 0 <= vn < len(normals), "normal index out of range"
        # reject zero-area faces
        p = [positions[t[0]] for t in f]
        a = cross((p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]),
                  (p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]))
        assert math.sqrt(sum(c * c for c in a)) > 1e-10, "degenerate face"
    for n in normals:
        assert abs(math.sqrt(sum(c * c for c in n)) - 1.0) < 1e-6, "non-unit normal"
    for u, v in uvs:
        assert -1e-9 <= u <= 1 + 1e-9 and -1e-9 <= v <= 1 + 1e-9, "uv out of range"
    ys = [p[1] for p in positions]
    rs = [math.hypot(p[0], p[2]) for p in positions]
    return {"tris": tri, "quads": quad, "height": max(ys) - min(ys), "radius": max(rs)}


def generate(out_dir, basename, segments, fillet_steps, step_steps, name):
    profile = build_profile(fillet_steps, step_steps)
    positions, uvs, normals, faces = build_mesh(profile, segments)
    stats = validate(positions, uvs, normals, faces)

    obj_path = os.path.join(out_dir, basename + ".obj")
    write_obj(obj_path, positions, uvs, normals, faces, name, "oryzo-1.mtl", segments)
    size = os.path.getsize(obj_path)
    print(f"{basename}.obj  verts={len(positions):5d} uvs={len(uvs):5d} "
          f"norms={len(normals):5d} faces={len(faces):5d} "
          f"(quads={stats['quads']}, tris={stats['tris']}) "
          f"radius={stats['radius']:.4f} height={stats['height']:.4f} "
          f"size={size/1024:.1f}KB")
    return size


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "assets"
    os.makedirs(out_dir, exist_ok=True)

    generate(out_dir, "oryzo-1", segments=96, fillet_steps=5, step_steps=6,
             name="ORYZO-1")
    generate(out_dir, "oryzo-1-q4", segments=32, fillet_steps=2, step_steps=3,
             name="ORYZO-1-q4")

    with open(os.path.join(out_dir, "oryzo-1.mtl"), "w") as f:
        f.write(MTL)
    print("oryzo-1.mtl written")


if __name__ == "__main__":
    main()
