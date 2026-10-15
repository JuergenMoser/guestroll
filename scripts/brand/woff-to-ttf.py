"""Converts a WOFF 1.0 font to TTF/OTF (the tables, inflated with zlib).

sharp's bundled fontconfig/FreeType can't read WOFF, and the QR caption is
rasterised by sharp: assets/fonts/*.ttf are generated from the WOFF files with
this script. Usage: python3 woff-to-ttf.py in.woff out.ttf
"""
import struct
import sys
import zlib

src, dst = sys.argv[1], sys.argv[2]
data = open(src, "rb").read()
signature, flavor, length, num_tables = struct.unpack(">4sIIH", data[:14])
assert signature == b"wOFF", "not a WOFF 1.0 file"

tables = []
for i in range(num_tables):
    tag, offset, comp_len, orig_len, checksum = struct.unpack(">4sIIII", data[44 + i * 20 : 64 + i * 20])
    raw = data[offset : offset + comp_len]
    tables.append((tag, checksum, zlib.decompress(raw) if comp_len < orig_len else raw))

entry_selector = max(i for i in range(16) if 2**i <= num_tables)
search_range = 2**entry_selector * 16
header = struct.pack(">IHHHH", flavor, num_tables, search_range, entry_selector, num_tables * 16 - search_range)
offset = 12 + 16 * num_tables
directory, body = b"", b""
for tag, checksum, table in tables:
    directory += struct.pack(">4sIII", tag, checksum, offset + len(body), len(table))
    body += table + b"\0" * ((4 - len(table) % 4) % 4)
open(dst, "wb").write(header + directory + body)
