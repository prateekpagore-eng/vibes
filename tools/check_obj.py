#!/usr/bin/env python3
"""Validate a generated ORYZO OBJ by re-parsing the file from disk.

Checks what a loader (and a 3D package) actually cares about:
  - every face index resolves
  - no degenerate (zero-area) faces
  - normals are unit length
  - UVs lie in [0,1]
  - the surface is closed and 2-manifold (each edge shared by exactly 2 faces)
  - winding is outward (positive signed volume), and volume is plausible
"""

import math
import sys
from collections import defaultdict


def parse(path):
    v, vt, vn, faces = [], [], [], []
    for line in open(path):
        if line.startswith("#") or not line.strip():
            continue
        tok = line.split()
        tag = tok[0]
        if tag == "v":
            v.append(tuple(float(x) for x in tok[1:4]))
        elif tag == "vt":
            vt.append(tuple(float(x) for x in tok[1:3]))
        elif tag == "vn":
            vn.append(tuple(float(x) for x in tok[1:4]))
        elif tag == "f":
            face = []
            for part in tok[1:]:
                a, b, c = (part.split("/") + ["", ""])[:3]
                face.append((int(a) - 1, int(b) - 1 if b else None,
                             int(c) - 1 if c else None))
            faces.append(face)
    return v, vt, vn, faces


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def check(path):
    v, vt, vn, faces = parse(path)
    errs = []

    # index resolution
    for fi, f in enumerate(faces):
        for (a, b, c) in f:
            if not (0 <= a < len(v)):
                errs.append(f"face {fi}: v index {a} out of range")
            if b is not None and not (0 <= b < len(vt)):
                errs.append(f"face {fi}: vt index {b} out of range")
            if c is not None and not (0 <= c < len(vn)):
                errs.append(f"face {fi}: vn index {c} out of range")

    # normals unit length
    for i, n in enumerate(vn):
        if abs(math.sqrt(dot(n, n)) - 1.0) > 1e-5:
            errs.append(f"vn {i} not unit length")

    # uv range
    for i, t in enumerate(vt):
        if not (-1e-6 <= t[0] <= 1 + 1e-6 and -1e-6 <= t[1] <= 1 + 1e-6):
            errs.append(f"vt {i} outside [0,1]: {t}")

    # triangulate (fan) for area / volume / manifold tests
    volume = 0.0
    edges = defaultdict(int)
    for fi, f in enumerate(faces):
        pts = [v[t[0]] for t in f]
        area = 0.0
        for k in range(1, len(pts) - 1):
            n = cross(sub(pts[k], pts[0]), sub(pts[k + 1], pts[0]))
            area += 0.5 * math.sqrt(dot(n, n))
            # signed volume of tetra (origin, p0, pk, pk+1)
            volume += dot(pts[0], cross(pts[k], pts[k + 1])) / 6.0
        if area < 1e-10:
            errs.append(f"face {fi}: degenerate (area {area:.2e})")
        # undirected edges by position index
        idx = [t[0] for t in f]
        for k in range(len(idx)):
            a, b = idx[k], idx[(k + 1) % len(idx)]
            if a == b:
                errs.append(f"face {fi}: repeated vertex {a}")
                continue
            edges[(min(a, b), max(a, b))] += 1

    bad_edges = {e: c for e, c in edges.items() if c != 2}
    if bad_edges:
        errs.append(f"non-manifold/open: {len(bad_edges)} edges not shared by "
                    f"exactly 2 faces (e.g. {list(bad_edges.items())[:3]})")

    if volume <= 0:
        errs.append(f"winding is inward (signed volume {volume:.4f})")
    if not (0.30 < abs(volume) < 0.60):
        errs.append(f"volume {abs(volume):.4f} outside plausible range")

    ys = [p[1] for p in v]
    rs = [math.hypot(p[0], p[2]) for p in v]
    print(f"{path}")
    print(f"  v={len(v)} vt={len(vt)} vn={len(vn)} faces={len(faces)}")
    print(f"  radius={max(rs):.4f}  height={max(ys)-min(ys):.4f}  "
          f"volume={volume:.4f}  edges={len(edges)}")
    if errs:
        print("  FAIL:")
        for e in errs[:12]:
            print(f"    - {e}")
        return False
    print("  OK: closed 2-manifold, outward winding, indices/normals/uvs valid")
    return True


if __name__ == "__main__":
    ok = all(check(p) for p in sys.argv[1:])
    sys.exit(0 if ok else 1)
