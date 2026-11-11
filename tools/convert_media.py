"""Convert the game's media to efficient formats, keeping a converted file only when it is smaller than its source.

  Images  .png / .jpg  -> .webp  (quality 82, alpha kept, same resolution; retried at 75 if not smaller)
  Audio   .m4a / .mp3  -> .ogg   (Opus: mono speech 48 kbps, stereo music 96 kbps; retried lower if not smaller)

Lossy WebP already in assets/ is left alone (re-encoding lossy art only loses quality). There are no videos.
The source files stay where they are: the converted audio is the main format and the original is the fallback for
browsers that can't play Ogg Opus (see js/preload.js); converted images replace their source, which is removed.

Needs Pillow (WebP) and an ffmpeg with libopus:  pip install pillow imageio-ffmpeg
Usage: python3 tools/convert_media.py [--ffmpeg PATH]          (then run tools/build.py)
Prints one line per file with source and output size; exits non-zero if any output would be larger.
"""
import argparse, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'


def ffmpeg_path(given):
    if given:
        return given
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return 'ffmpeg'


def probe(ff, src):
    """(channels, bitrate in bit/s) of the first audio stream, read from ffmpeg's banner"""
    out = subprocess.run([ff, '-hide_banner', '-i', str(src)], capture_output=True, text=True).stderr
    channels = 2 if 'stereo' in out.split('Audio:', 1)[-1].split('\n', 1)[0] else 1
    rate = next((int(w) for line in out.splitlines() if 'Audio:' in line
                 for w, u in zip(line.split(), line.split()[1:]) if u.startswith('kb/s') and w.isdigit()), 0) * 1000
    return channels, rate


def to_ogg(ff, src, dst, kbps):
    subprocess.run([ff, '-v', 'error', '-y', '-i', str(src), '-map', '0:a:0', '-map_metadata', '-1', '-vn',
                    '-c:a', 'libopus', '-b:a', f'{kbps}k', '-vbr', 'on', '-compression_level', '10', str(dst)], check=True)


def convert_audio(ff, src):
    dst = src.with_suffix('.ogg')
    channels, rate = probe(ff, src)
    # mono speech is transparent at 48 kbps in Opus; stereo music gets 96 kbps; never above 75 % of the source
    first = 96 if channels == 2 else 48
    if rate:
        first = min(first, max(24, int(rate * .75 / 1000)))
    for kbps in (first, int(first * .8), int(first * .65)):
        to_ogg(ff, src, dst, kbps)
        if dst.stat().st_size < src.stat().st_size:
            return dst, kbps
    dst.unlink()
    return None, None


def convert_image(src):
    from PIL import Image
    dst = src.with_suffix('.webp')
    im = Image.open(src)
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    for q in (82, 75):
        im.save(dst, 'WEBP', quality=q, method=6, alpha_quality=90)
        if dst.stat().st_size < src.stat().st_size:
            return dst, q
    dst.unlink()
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ffmpeg')
    ff = ffmpeg_path(ap.parse_args().ffmpeg)
    report, bad = [], 0
    for src in sorted(ASSETS.glob('*.png')) + sorted(ASSETS.glob('*.jpg')):
        size = src.stat().st_size
        dst, q = convert_image(src)
        report.append((src, size, dst, f'webp q{q}' if dst else 'kept: WebP was not smaller'))
        if dst:
            src.unlink()  # the WebP replaces it everywhere (asset names carry no extension)
        bad += not dst
    for src in sorted((ASSETS / 'audio').glob('*.m4a')) + sorted((ASSETS / 'audio').glob('*.mp3')):
        size = src.stat().st_size
        dst, kbps = convert_audio(ff, src)
        report.append((src, size, dst, f'opus {kbps}k' if dst else 'kept: Ogg was not smaller'))
        bad += not dst
    for src, size, dst, how in report:
        out = dst.stat().st_size if dst else size
        print(f"{src.relative_to(ROOT)!s:40s} {size/1024:8.1f} KB -> {out/1024:8.1f} KB  {out/size:6.1%}  {how}")
    print(f'{len(report)} files, {bad} kept as they were')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
