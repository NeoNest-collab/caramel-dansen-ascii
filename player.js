const ASCII_RAMP = " .:-=+*#%@";

class ASCIIVideoPlayer {
    constructor() {
        this.canvas = document.getElementById('videoCanvas');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.errorBox = document.getElementById('errorBox');
        
        this.video = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentMode = 'halfblock';
        this.startTime = 0;
        this.frameCount = 0;
        this.frames = [];
        this.currentFrameIndex = 0;
        this.animationId = null;
        this.fps = 30;
        this.lastFrameTime = 0;
        this.fpsCounter = 0;
        this.fpsUpdateTime = 0;

        this.setupEventListeners();
        this.initVideo();
    }

    setupEventListeners() {
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.downloadBtn.addEventListener('click', () => this.downloadASCII());

        // Mode toggle
        document.querySelectorAll('.mode-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMode = e.target.dataset.mode;
                if (this.isPlaying && this.currentFrameIndex < this.frames.length) {
                    this.renderFrame(this.currentFrameIndex);
                }
            });
        });
    }

    initVideo() {
        // Create a hidden video element to load the sample video
        this.video = document.createElement('video');
        this.video.crossOrigin = 'anonymous';
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.video.addEventListener('error', (e) => this.showError('Failed to load video'));

        // Use a sample Caramel Dansen video or fallback
        this.video.src = 'https://media.githubusercontent.com/media/NeoNest-collab/caramel-dansen-ascii/main/sample.mp4';
        
        // Fallback to a public source if available
        if (!this.video.src) {
            this.showError('No video source found. Please add a sample.mp4 file to the repository.');
        }
    }

    onVideoLoaded() {
        this.fps = 30; // Default FPS
        this.extractFrames();
    }

    extractFrames() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const width = 160; // ASCII width
        const height = 60;  // ASCII height
        
        canvas.width = width;
        canvas.height = height;

        let frameIndex = 0;
        const totalFrames = Math.floor(this.video.duration * this.fps);

        const extractFrame = () => {
            if (frameIndex >= totalFrames) {
                this.canvas.textContent = '';
                this.playBtn.disabled = false;
                this.canvas.textContent = '✓ Ready to play';
                return;
            }

            this.video.currentTime = frameIndex / this.fps;
            
            // Wait for frame to be ready
            setTimeout(() => {
                ctx.drawImage(this.video, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                this.frames.push(imageData.data);
                
                frameIndex++;
                this.canvas.textContent = `Loading frames... ${frameIndex}/${totalFrames}`;
                
                // Process next frame asynchronously
                requestAnimationFrame(extractFrame);
            }, 50);
        };

        extractFrame();
    }

    play() {
        if (this.frames.length === 0) {
            this.showError('No frames loaded');
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.playBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.stopBtn.disabled = false;
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;
        this.currentFrameIndex = 0;

        this.animate();
    }

    pause() {
        this.isPaused = true;
        this.isPlaying = false;
        this.pauseBtn.disabled = true;
        this.playBtn.disabled = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentFrameIndex = 0;
        this.playBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.stopBtn.disabled = true;
        this.canvas.textContent = '✓ Stopped';
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    animate() {
        if (!this.isPlaying) return;

        const now = performance.now();
        const frameTime = 1000 / this.fps;
        
        // Update FPS counter
        this.fpsCounter++;
        if (now - this.fpsUpdateTime >= 1000) {
            document.getElementById('fps').textContent = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsUpdateTime = now;
        }

        if (now - this.lastFrameTime >= frameTime) {
            if (this.currentFrameIndex < this.frames.length) {
                this.renderFrame(this.currentFrameIndex);
                this.currentFrameIndex++;
                this.lastFrameTime = now;
                
                // Update stats
                document.getElementById('frameCount').textContent = this.currentFrameIndex;
                const seconds = Math.floor(this.currentFrameIndex / this.fps);
                const minutes = Math.floor(seconds / 60);
                document.getElementById('currentTime').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
            } else {
                this.stop();
                return;
            }
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    renderFrame(frameIndex) {
        if (frameIndex >= this.frames.length) return;

        const pixelData = this.frames[frameIndex];
        const width = 160;
        const height = 60;

        let output = '';

        if (this.currentMode === 'halfblock') {
            output = this.renderHalfblock(pixelData, width, height);
        } else {
            output = this.renderASCII(pixelData, width, height);
        }

        this.canvas.textContent = output;
    }

    renderHalfblock(pixelData, width, height) {
        let output = '';

        for (let y = 0; y < height; y += 2) {
            for (let x = 0; x < width; x++) {
                const topIdx = (y * width + x) * 4;
                const botIdx = ((y + 1) * width + x) * 4;

                const tr = pixelData[topIdx];
                const tg = pixelData[topIdx + 1];
                const tb = pixelData[topIdx + 2];

                const br = pixelData[botIdx] || 0;
                const bg = pixelData[botIdx + 1] || 0;
                const bb = pixelData[botIdx + 2] || 0;

                output += `\x1b[38;2;${tr};${tg};${tb};48;2;${br};${bg};${bb}m▀\x1b[0m`;
            }
            output += '\n';
        }

        return output;
    }

    renderASCII(pixelData, width, height) {
        let output = '';
        const rampLen = ASCII_RAMP.length;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = pixelData[idx];
                const g = pixelData[idx + 1];
                const b = pixelData[idx + 2];

                // Perceived brightness
                const lum = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
                const char = ASCII_RAMP[Math.floor(lum * (rampLen - 1) / 255)];

                output += `\x1b[38;2;${r};${g};${b}m${char}\x1b[0m`;
            }
            output += '\n';
        }

        return output;
    }

    downloadASCII() {
        if (this.frames.length === 0) {
            this.showError('No frames to download');
            return;
        }

        let fullASCII = '';
        for (let i = 0; i < this.frames.length; i++) {
            fullASCII += `\n=== Frame ${i + 1} ===\n`;
            fullASCII += this.renderFrame(i) || '';
        }

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fullASCII));
        element.setAttribute('download', 'caramel-dansen-ascii.txt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    showError(message) {
        this.errorBox.textContent = message;
        this.errorBox.style.display = 'block';
        console.error(message);
    }
}

// Initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ASCIIVideoPlayer();
});
