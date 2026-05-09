# stitch_predicted_folder.py
import os
import re
import math
from PIL import Image
import xml.etree.ElementTree as ET

def read_size_from_vips_xml(xml_path):
    """Return (width, height) from a vips dzsave XML if present, else None."""
    try:
        tree = ET.parse(xml_path)
    except Exception as e:
        print(f"[xml] Failed to parse xml {xml_path}: {e}")
        return None
    root = tree.getroot()
    ns = ""
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0].strip("{")
    prop_tag = f"{{{ns}}}property" if ns else "property"
    name_tag = f"{{{ns}}}name" if ns else "name"
    value_tag = f"{{{ns}}}value" if ns else "value"

    width = height = None
    for prop in root.findall(f".//{prop_tag}"):
        name_el = prop.find(name_tag)
        val_el = prop.find(value_tag)
        if name_el is None or val_el is None:
            continue
        name = (name_el.text or "").strip().lower()
        if name == "width":
            width = int(val_el.text)
        elif name == "height":
            height = int(val_el.text)
    if width is not None and height is not None:
        print(f"[xml] Parsed full size: {width} x {height}")
        return width, height
    return None

def parse_coords_from_name(fname):
    """
    Try to extract two integers from a filename. Return (a,b) or None.
    Matches patterns like:
      - anything_12_34.ext
      - anything-r12_c34.ext
      - anything.12.34.ext
      - anything-12x34.ext
    """
    n = os.path.basename(fname)
    patterns = [
        r"[_\.-]r?ow?[_\.-]?(\d+)[_\.-]c?o?l?[_\.-]?(\d+)",  # row12_col34
        r"[_\.-]r?(\d+)[_\.-]c?(\d+)",                       # r12_c34
        r"[_\.-](\d+)[_\.-](\d+)",                          # _12_34
        r"-(\d+)x(\d+)",
        r"_(\d+)x(\d+)"
    ]
    for p in patterns:
        m = re.search(p, n, flags=re.IGNORECASE)
        if m:
            return int(m.group(1)), int(m.group(2))
    # fallback: any two ints in filename (take last two)
    ints = re.findall(r"(\d+)", n)
    if len(ints) >= 2:
        return int(ints[-2]), int(ints[-1])
    return None

def stitch_predicted_folder(predicted_folder, out_path,
                            xml_path=None, tiles_per_row=None, tile_exts=(".png", ".tif", ".tiff", ".jpg", ".jpeg", ".bmp")):
    """
    Stitch predicted tiles from predicted_folder and save to out_path.
    If xml_path given and contains width/height, final canvas will be that size and image will be cropped to it.
    If filenames contain coordinates, they will be used; otherwise tiles_per_row (int) is required for row-major layout.
    """
    # 1) collect tile files (recursive)
    tile_files = []
    for root, _, files in os.walk(predicted_folder):
        for f in files:
            if f.lower().endswith(tile_exts):
                tile_files.append(os.path.join(root, f))
    tile_files = sorted(tile_files)
    if not tile_files:
        raise FileNotFoundError(f"No tile images found in {predicted_folder}")

    print(f"[info] Found {len(tile_files)} tiles in {predicted_folder} (recursive).")

    # 2) try optional xml
    full_size = None
    if xml_path and os.path.exists(xml_path):
        full_size = read_size_from_vips_xml(xml_path)

    # 3) inspect tiles: sizes and parsed coords
    sizes = {}
    coords_map = {}
    for fp in tile_files:
        coords_map[fp] = parse_coords_from_name(fp)
        with Image.open(fp) as im:
            sizes[fp] = im.size  # (w,h)

    # canonical tile size = most common tile size
    size_counts = {}
    for s in sizes.values():
        size_counts[s] = size_counts.get(s, 0) + 1
    tile_w, tile_h = max(size_counts.items(), key=lambda x: x[1])[0]
    print(f"[info] Canonical tile size: {tile_w} x {tile_h}")

    # 4) determine layout
    parsed = {fp: c for fp, c in coords_map.items() if c is not None}
    interpret_as = None
    if parsed:
        pairs = list(parsed.values())
        first_vals = [p[0] for p in pairs]
        second_vals = [p[1] for p in pairs]
        range_first = max(first_vals) - min(first_vals) + 1
        range_second = max(second_vals) - min(second_vals) + 1

        # compute which mapping better matches full_size if available else assume row_col
        if full_size:
            possible1 = (range_second * tile_w, range_first * tile_h)  # if parsed is row,col => width = range_second*tile_w
            possible2 = (range_first * tile_w, range_second * tile_h)  # if parsed is col,row
            score1 = abs(possible1[0] - full_size[0]) + abs(possible1[1] - full_size[1])
            score2 = abs(possible2[0] - full_size[0]) + abs(possible2[1] - full_size[1])
            interpret_as = "row_col" if score1 <= score2 else "col_row"
        else:
            # no xml -> assume parsed is (row, col)
            interpret_as = "row_col"
        print(f"[info] Parsed coords detected; interpreting parsed tuples as: {interpret_as}")

    # determine canvas grid (cols x rows)
    if full_size:
        full_w, full_h = full_size
        n_cols = math.ceil(full_w / tile_w)
        n_rows = math.ceil(full_h / tile_h)
        print(f"[info] Using XML canvas: {full_w}x{full_h} -> grid {n_cols} x {n_rows}")
    else:
        # infer from parsed coordinates or tiles_per_row
        if parsed:
            first_vals = [p[0] for p in parsed.values()]
            second_vals = [p[1] for p in parsed.values()]
            if interpret_as == "row_col":
                n_rows = max(first_vals) - min(first_vals) + 1
                n_cols = max(second_vals) - min(second_vals) + 1
            else:
                n_cols = max(first_vals) - min(first_vals) + 1
                n_rows = max(second_vals) - min(second_vals) + 1
            full_w = n_cols * tile_w
            full_h = n_rows * tile_h
            print(f"[info] Inferred grid from parsed coords: {n_cols} x {n_rows}, canvas {full_w}x{full_h}")
        else:
            if tiles_per_row is None:
                raise ValueError("Could not parse coords from filenames and tiles_per_row not provided.")
            n_cols = tiles_per_row
            n_rows = math.ceil(len(tile_files) / n_cols)
            full_w = n_cols * tile_w
            full_h = n_rows * tile_h
            print(f"[info] Using tiles_per_row layout: {n_cols} x {n_rows}, canvas {full_w}x{full_h}")

    # 5) create canvas using sample tile mode
    sample_mode = None
    with Image.open(tile_files[0]) as s:
        sample_mode = s.mode
    stitched = Image.new(sample_mode, (full_w, full_h))
    print(f"[info] Created stitched canvas mode={sample_mode} size={(full_w,full_h)}")

    # 6) paste tiles
    if parsed:
        # build grid mapping (r,c)->file
        grid = {}
        for fp, pair in coords_map.items():
            if pair is None:
                continue
            a, b = pair
            if interpret_as == "row_col":
                r, c = a, b
            else:
                r, c = b, a
            grid[(r, c)] = fp

        min_r = min(k[0] for k in grid.keys())
        min_c = min(k[1] for k in grid.keys())

        for (r, c), fp in grid.items():
            rr = r - min_r
            cc = c - min_c
            x = cc * tile_w
            y = rr * tile_h
            with Image.open(fp) as im:
                # if tile smaller (edge), paste as-is (will be cropped later if using xml)
                stitched.paste(im.convert(sample_mode), (x, y))
    else:
        # row-major sorted order
        for idx, fp in enumerate(tile_files):
            rr = idx // n_cols
            cc = idx % n_cols
            x = cc * tile_w
            y = rr * tile_h
            with Image.open(fp) as im:
                stitched.paste(im.convert(sample_mode), (x, y))

    # 7) final crop if xml provided or just to remove overshoot
    stitched = stitched.crop((0, 0, full_w, full_h))

    # make sure output dir exists
    out_dir = os.path.dirname(out_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    stitched.save(out_path)
    print(f"[done] Stitched image saved to: {out_path}")
    return out_path
