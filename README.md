# 🎵 Caramel Dansen - ASCII Art Animation Player

A web-based ASCII video player that renders Caramel Dansen in real-time using 24-bit color terminal escape sequences.

## Features

✨ **Two Rendering Modes:**
- **Halfblock Mode**: Uses Unicode `▀` characters with dual 24-bit colors (foreground + background) for higher resolution
- **ASCII Mode**: Classic ASCII ramp with perceived brightness and 24-bit foreground color tinting

🎨 **24-bit True Color**: Full RGB color support for vibrant ASCII rendering

⚡ **Real-time Performance**: Frame-by-frame rendering with FPS counter and sync optimization

📊 **Live Statistics**: Current FPS, frame count, and playback time

⬇️ **Export**: Download the entire animation as a text file

## How It Works

1. **Video Input**: Loads a video file (Caramel Dansen)
2. **Frame Extraction**: Converts video frames to small resolution (160x60 for quality/performance balance)
3. **Pixel Analysis**: 
   - In halfblock mode: Pairs two vertical pixels per character position
   - In ASCII mode: Calculates perceived brightness (0.299R + 0.587G + 0.114B)
4. **ANSI Rendering**: Uses terminal escape sequences (`\x1b[38;2;R;G;Bm`) for true color output
5. **Playback Synchronization**: Maintains frame timing with drift correction

## Setup

### Web Player (Recommended)
1. Open `index.html` in a modern browser
2. Click "Play" to start the animation
3. Switch between halfblock and ASCII modes
4. Download the ASCII art if desired

### Prerequisites
- Modern web browser with Canvas API support
- A video file (MP4 recommended) - place it as `sample.mp4` in the repository root

### Local Python Version

```bash
# Install dependencies
pip install -r requirements.txt

# Run the CLI player
python ascii_player.py <path_to_video> [halfblock|ascii]
```

**Dependencies:**
- FFmpeg + FFplay
- Python 3.7+

## Video Specifications

- **Resolution**: 160x60 pixels for ASCII rendering
- **Frame Rate**: Auto-detected (fallback 30 FPS)
- **Color Format**: RGB24 (24-bit color)

## Terminal Escape Sequences Used

```ansi
\x1b[38;2;R;G;Bm       # 24-bit foreground color
\x1b[48;2;R;G;Bm       # 24-bit background color
\x1b[0m                 # Reset formatting
\x1b[H                  # Move cursor home
\x1b[?25l               # Hide cursor
\x1b[?25h               # Show cursor
```

## Performance Optimization

- **Frame Buffer**: Pre-computed escape sequences to minimize rendering overhead
- **Atomic Writes**: Single stdout flush per frame to prevent flicker
- **Canvas 2D**: Hardware-accelerated frame resizing
- **RequestAnimationFrame**: Browser-optimized rendering loop

## Known Limitations

- Web player requires video to be loadable via CORS
- Frame extraction is asynchronous; large videos may take time to load
- Terminal resolution in CLI mode varies by screen size
- Color accuracy depends on terminal color profile

## Future Enhancements

- [ ] Live video input support (webcam)
- [ ] Preset animations library
- [ ] Stereo audio support in web player
- [ ] Adaptive quality based on device performance
- [ ] Keybind controls (pause, seek, speed)
- [ ] Mobile-responsive design

## License

MIT License - Feel free to use and modify!

## Credits

**Caramel Dansen**: [Pika Pika](https://www.youtube.com/watch?v=zvq9r8ctikY)

Rendered in gorgeous ASCII by your terminal. 🖥️
