"""
ASCII Video Player - Terminal-based renderer for video files with two modes:
- halfblock: Unicode ▀ with 24-bit dual color
- ascii: Classic ASCII ramp with perceived brightness
"""

import os
import shutil
import subprocess
import sys
import time

ASCII_RAMP = " .:-=+*#%@"


def get_video_info(video_path: str):
    """Probe video dimensions and frame rate using ffprobe."""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=r_frame_rate",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        video_path,
    ]
    try:
        out = subprocess.check_output(cmd).decode().strip()
        num, den = map(int, out.split("/"))
        return num / den
    except Exception as e:
        print(f"Warning: Could not determine FPS ({e}), using fallback 30 FPS", file=sys.stderr)
        return 30.0


def render_ascii_video(video_path: str, mode: str = "halfblock"):
    """
    Render video as ASCII art to terminal.
    
    mode='halfblock': Uses Unicode ▀ for true 24-bit color at 2x resolution.
    mode='ascii': Uses classic ASCII characters with 24-bit foreground tint.
    """
    if not os.path.exists(video_path):
        print(f"Error: File '{video_path}' not found.")
        sys.exit(1)

    if mode not in ("halfblock", "ascii"):
        print(f"Error: Invalid mode '{mode}'. Use 'halfblock' or 'ascii'.")
        sys.exit(1)

    term_cols, term_lines = shutil.get_terminal_size((80, 24))

    # Keep 1 line buffer to prevent scroll jitter
    render_w = term_cols
    render_h = (term_lines - 1) * (2 if mode == "halfblock" else 1)

    fps = get_video_info(video_path)
    frame_time = 1.0 / fps
    frame_bytes = render_w * render_h * 3

    print(f"Starting playback: {video_path}", file=sys.stderr)
    print(f"Mode: {mode} | Resolution: {render_w}x{render_h} | FPS: {fps:.2f}", file=sys.stderr)

    # 1. Spawn Audio Player Subprocess
    try:
        audio_proc = subprocess.Popen(
            ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", video_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        print("Warning: ffplay not found. Audio will not play.", file=sys.stderr)
        audio_proc = None

    # 2. Spawn FFmpeg Raw Video Pipe
    video_cmd = [
        "ffmpeg",
        "-i",
        video_path,
        "-f",
        "image2pipe",
        "-pix_fmt",
        "rgb24",
        "-vcodec",
        "rawvideo",
        "-s",
        f"{render_w}x{render_h}",
        "-loglevel",
        "quiet",
        "-",
    ]
    
    try:
        video_proc = subprocess.Popen(video_cmd, stdout=subprocess.PIPE, bufsize=10**7)
    except FileNotFoundError:
        print("Error: ffmpeg not found. Please install FFmpeg.", file=sys.stderr)
        sys.exit(1)

    # Setup terminal: Hide cursor and clear
    sys.stdout.write("\x1b[?25l\x1b[2J")
    sys.stdout.flush()

    start_time = time.perf_counter()
    frame_idx = 0
    frames_dropped = 0

    try:
        while True:
            raw_frame = video_proc.stdout.read(frame_bytes)
            if len(raw_frame) < frame_bytes:
                break

            buf = bytearray(b"\x1b[H")  # Move cursor to home (top-left)

            if mode == "halfblock":
                # Process pairs of rows (top and bottom pixels)
                row_stride = render_w * 3
                for y in range(0, render_h, 2):
                    top_row = raw_frame[y * row_stride : (y + 1) * row_stride]
                    bot_row = raw_frame[
                        (y + 1) * row_stride : (y + 2) * row_stride
                    ]

                    for x in range(render_w):
                        i = x * 3
                        tr, tg, tb = top_row[i], top_row[i + 1], top_row[i + 2]
                        br, bg, bb = bot_row[i], bot_row[i + 1], bot_row[i + 2]

                        # FG = top pixel, BG = bottom pixel, char = upper half block
                        buf.extend(
                            f"\x1b[38;2;{tr};{tg};{tb};48;2;{br};{bg};{bb}m▀".encode(
                                "ascii"
                            )
                        )
                    buf.extend(b"\x1b[0m\n")

            else:
                # Classic ASCII with 24-bit TrueColor foreground
                ramp_len = len(ASCII_RAMP)
                for y in range(render_h):
                    row = raw_frame[y * render_w * 3 : (y + 1) * render_w * 3]
                    for x in range(render_w):
                        i = x * 3
                        r, g, b = row[i], row[i + 1], row[i + 2]
                        # Perceived brightness formula
                        lum = int(0.299 * r + 0.587 * g + 0.114 * b)
                        char = ASCII_RAMP[lum * (ramp_len - 1) // 255]

                        buf.extend(
                            f"\x1b[38;2;{r};{g};{b}m{char}".encode("ascii")
                        )
                    buf.extend(b"\x1b[0m\n")

            # Single atomic flush to avoid flicker
            try:
                sys.stdout.buffer.write(buf)
                sys.stdout.buffer.flush()
            except BrokenPipeError:
                break

            # Clock synchronization with drift correction
            frame_idx += 1
            target_time = start_time + (frame_idx * frame_time)
            sleep_duration = target_time - time.perf_counter()
            
            if sleep_duration > 0:
                time.sleep(sleep_duration)
            elif sleep_duration < -frame_time:
                frames_dropped += 1

    except KeyboardInterrupt:
        print("\nPlayback interrupted by user.", file=sys.stderr)
    except Exception as e:
        print(f"\nError during playback: {e}", file=sys.stderr)
    finally:
        # Cleanup processes and restore cursor
        try:
            video_proc.terminate()
            video_proc.wait(timeout=2)
        except:
            video_proc.kill()
        
        if audio_proc:
            try:
                audio_proc.terminate()
                audio_proc.wait(timeout=2)
            except:
                audio_proc.kill()

        sys.stdout.write("\x1b[0m\x1b[?25h\n")
        sys.stdout.flush()
        
        if frames_dropped > 0:
            print(f"Dropped {frames_dropped} frames due to performance", file=sys.stderr)
        print(f"Playback complete. Rendered {frame_idx} frames.", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ascii_player.py <path_to_video> [halfblock|ascii]")
        print("\nExample:")
        print("  python ascii_player.py video.mp4 halfblock")
        print("  python ascii_player.py video.mp4 ascii")
        sys.exit(1)

    vid = sys.argv[1]
    render_mode = sys.argv[2] if len(sys.argv) > 2 else "halfblock"
    render_ascii_video(vid, render_mode)
