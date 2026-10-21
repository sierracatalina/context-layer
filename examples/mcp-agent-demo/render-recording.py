#!/usr/bin/env python3
"""Render an actual timestamped stdout recording, not a simulated terminal run.
Optional media-production dependencies: Python 3, Pillow, and ffmpeg.
"""
import json, math, re, subprocess, sys, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

source, target = map(Path, sys.argv[1:3])
recording = json.loads(source.read_text())
duration = recording['duration_seconds']
if duration > 120:
    raise SystemExit('Refusing a recording longer than two minutes')
fontdir = Path('/usr/share/fonts/truetype/dejavu')
mono = ImageFont.truetype(str(fontdir / 'DejaVuSansMono.ttf'), 20)
small = ImageFont.truetype(str(fontdir / 'DejaVuSans.ttf'), 17)
heading = ImageFont.truetype(str(fontdir / 'DejaVuSans-Bold.ttf'), 32)
fps = 2
frames = math.ceil(duration * fps)
process = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1280x720', '-r', str(fps), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '24', '-pix_fmt', 'yuv420p', '-r', '10', '-movflags', '+faststart', str(target)], stdin=subprocess.PIPE)
ansi = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]')
poster = None
for frame in range(frames):
    seconds = frame / fps
    seen = [event for event in recording['events'] if event['seconds'] <= seconds]
    stage = seen[-1]['stage'] if seen else '01 / THE TASK'
    body = ''.join(event['text'] for event in seen if event['stage'] == stage and event['kind'] != 'stage')
    body = ansi.sub('', body)
    lines = []
    for line in body.splitlines():
        lines.extend(textwrap.wrap(line, width=96, replace_whitespace=False) or [''])
    lines = lines[-19:]
    image = Image.new('RGB', (1280, 720), '#0d1117')
    draw = ImageDraw.Draw(image)
    draw.text((42, 22), 'context layer / actual MCP exchange', font=heading, fill='#edf2ef')
    draw.text((42, 68), 'synthetic data • model agent → shell bridge → official MCP client → stdio server', font=small, fill='#95bba8')
    draw.rounded_rectangle((30, 110, 1250, 641), radius=14, fill='#151c23', outline='#354039', width=2)
    draw.text((52, 125), stage, font=small, fill='#b8cf78')
    for i, line in enumerate(lines):
        draw.text((52, 164 + i * 24), line, font=mono, fill='#e4e6e3')
    footer = 'Live command stdout + clearly labeled replay of previously recorded agent results'
    draw.text((42, 659), footer, font=small, fill='#a7aca8')
    draw.text((42, 687), 'No native host integration, provider deletion, or production-security claim.', font=small, fill='#a7aca8')
    draw.text((1140, 659), f'{int(seconds):02d}s / {math.ceil(duration):02d}s', font=small, fill='#a7aca8')
    process.stdin.write(image.tobytes())
    if poster is None and stage.startswith('04') and len(lines) > 6:
        poster = image.copy()
process.stdin.close()
if process.wait() != 0:
    raise SystemExit('ffmpeg failed')
if poster:
    poster.save(target.with_suffix('.png'))
# Subtitles are generated from actual stage-change timestamps.
stages = [event for event in recording['events'] if event['kind'] == 'stage']
def stamp(s):
    milliseconds = int(s * 1000)
    return f'{milliseconds//3600000:02}:{milliseconds//60000%60:02}:{milliseconds//1000%60:02},{milliseconds%1000:03}'
subtitle = []
for index, event in enumerate(stages):
    end = stages[index+1]['seconds'] if index + 1 < len(stages) else duration
    subtitle.append(f"{index+1}\n{stamp(event['seconds'])} --> {stamp(end)}\n{event['stage']}\n")
target.with_suffix('.srt').write_text('\n'.join(subtitle))
print(json.dumps({'seconds': duration, 'video': str(target), 'recording': str(source), 'frames': frames}))
