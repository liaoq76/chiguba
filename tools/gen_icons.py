"""生成 tabBar 占位 PNG 图标（81x81），灰色未激活 / 粉色激活。"""
import os
import struct
import zlib

OUT = r"d:\Data\ai\code\chigu\images\tab"
os.makedirs(OUT, exist_ok=True)

# 简化的图标形状：用一个简单的几何形状表达 tabBar 含义
# home / book / add / chart / mine（未激活灰、激活粉）

def make_png(width, height, draw_fn):
    # raw RGBA
    pixels = bytearray()
    for y in range(height):
        pixels.append(0)  # filter type
        for x in range(width):
            r, g, b, a = draw_fn(x, y, width, height)
            pixels.extend([r, g, b, a])

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(pixels), 9)
    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')


def in_circle(x, y, cx, cy, r):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def icon_home(active):
    color = (255, 111, 157, 255) if active else (180, 180, 180, 255)
    roof = (255, 111, 157, 255) if active else (170, 170, 170, 255)

    def f(x, y, w, h):
        cx, cy = w / 2, h / 2
        # 屋顶三角形
        if y < cy - 4 and abs(x - cx) <= (cy - y) * 0.7:
            return roof
        # 房身矩形
        if cy + 4 <= y <= cy + 22 and cx - 18 <= x <= cx + 18:
            return color
        # 门
        if cy + 10 <= y <= cy + 22 and cx - 5 <= x <= cx + 5:
            return (255, 255, 255, 255)
        return (0, 0, 0, 0)
    return f


def icon_book(active):
    color = (255, 111, 157, 255) if active else (180, 180, 180, 255)

    def f(x, y, w, h):
        cx, cy = w / 2, h / 2
        # 书本主体：两个矩形
        if cy - 20 <= y <= cy + 20:
            if cx - 22 <= x <= cx - 2 or cx + 2 <= x <= cx + 22:
                return color
        # 顶部弧
        if cy - 24 <= y < cy - 20 and abs(x - cx) <= 20:
            return color
        return (0, 0, 0, 0)
    return f


def icon_add(active):
    color = (255, 111, 157, 255) if active else (180, 180, 180, 255)

    def f(x, y, w, h):
        cx, cy = w / 2, h / 2
        # 横
        if abs(y - cy) <= 4 and cx - 18 <= x <= cx + 18:
            return color
        # 竖
        if abs(x - cx) <= 4 and cy - 18 <= y <= cy + 18:
            return color
        return (0, 0, 0, 0)
    return f


def icon_chart(active):
    color = (255, 111, 157, 255) if active else (180, 180, 180, 255)

    def f(x, y, w, h):
        cx, cy = w / 2, h / 2
        # 三根柱子
        bars = [(cx - 22, cx - 14, cy + 18, cy), (cx - 8, cx, cy + 18, cy - 12), (cx + 8, cx + 16, cy + 18, cy - 22)]
        for x1, x2, y1, y2 in bars:
            if x1 <= x <= x2 and y2 <= y <= y1:
                return color
        return (0, 0, 0, 0)
    return f


def icon_mine(active):
    color = (255, 111, 157, 255) if active else (180, 180, 180, 255)

    def f(x, y, w, h):
        cx, cy = w / 2, h / 2
        # 头
        if in_circle(x, y, cx, cy - 8, 9):
            return color
        # 肩
        if cy + 4 <= y <= cy + 22 and cx - 22 <= x <= cx + 22:
            # 上半圆弧
            dx = (x - cx) ** 2
            r = 20
            dy = (y - (cy + 24)) ** 2
            if dx + dy <= r * r:
                return color
        return (0, 0, 0, 0)
    return f


icons = {
    'home.png':     icon_home(False),
    'home_active.png': icon_home(True),
    'book.png':     icon_book(False),
    'book_active.png': icon_book(True),
    'add.png':      icon_add(False),
    'add_active.png': icon_add(True),
    'chart.png':    icon_chart(False),
    'chart_active.png': icon_chart(True),
    'mine.png':     icon_mine(False),
    'mine_active.png': icon_mine(True),
}

for name, fn in icons.items():
    data = make_png(81, 81, fn)
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(data)
    print('wrote', name, len(data), 'bytes')