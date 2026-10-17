/**
 * Frame sources for animated ASCII: <video> elements, video URLs/Files, and
 * animated GIFs (via the WebCodecs ImageDecoder where available).
 *
 * A FrameSource yields drawable frames on demand:
 *   { width, height, next(): Promise<{image, duration}> | null, play(), pause(), destroy() }
 */

const VIDEO_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|#|$)/i;
const GIF_EXT = /\.gif(\?|#|$)/i;

export function guessMediaKind(source) {
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    if (source.type === 'image/gif') return 'gif';
    if (source.type.startsWith('video/')) return 'video';
    return 'image';
  }
  if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) return 'video';
  if (typeof source === 'string') {
    if (VIDEO_EXT.test(source)) return 'video';
    if (GIF_EXT.test(source) || source.startsWith('data:image/gif')) return 'gif';
  }
  return 'image';
}

/** Wrap a <video> (or create one from a URL/Blob) as a frame source. */
export async function videoSource(source, { loop = true, muted = true } = {}) {
  let video;
  let objectUrl = null;
  if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
    video = source;
  } else {
    video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.preload = 'auto';
    if (typeof Blob !== 'undefined' && source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      video.src = objectUrl;
    } else {
      video.src = String(source);
    }
  }
  video.muted = muted;
  video.loop = loop;
  if (video.readyState < 2) {
    await new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('Could not load video')), { once: true });
    });
  }
  // Files recorded with MediaRecorder report duration = Infinity until the end is seen.
  if (!Number.isFinite(video.duration)) {
    await new Promise((resolve) => {
      const done = () => resolve();
      const t = setTimeout(done, 1500);
      video.addEventListener('durationchange', () => { if (Number.isFinite(video.duration)) { clearTimeout(t); done(); } });
      video.currentTime = 1e101;
    });
    await seekVideo(video, 0);
  }
  return {
    kind: 'video',
    element: video,
    width: video.videoWidth,
    height: video.videoHeight,
    duration: video.duration,
    async next() {
      return { image: video, duration: 0 };
    },
    play() {
      return video.play().catch(() => {});
    },
    pause() {
      video.pause();
    },
    seek(t) {
      return seekVideo(video, t);
    },
    destroy() {
      video.pause();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (objectUrl) video.removeAttribute('src');
    },
  };
}

/** Seek and resolve once the new frame is actually available to drawImage(). */
export function seekVideo(video, time) {
  return new Promise((resolve) => {
    const target = Math.max(0, Math.min(Number.isFinite(video.duration) ? video.duration - 0.001 : time, time));
    const finish = () => {
      if (typeof video.requestVideoFrameCallback === 'function') {
        const t = setTimeout(resolve, 120);
        video.requestVideoFrameCallback(() => { clearTimeout(t); resolve(); });
      } else {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }
    };
    if (Math.abs(video.currentTime - target) < 0.0005 && video.readyState >= 2) return finish();
    const t = setTimeout(finish, 1000);
    video.addEventListener('seeked', () => { clearTimeout(t); finish(); }, { once: true });
    video.currentTime = target;
  });
}

export function canDecodeGif() {
  return typeof ImageDecoder === 'function';
}

/**
 * Decode an animated GIF frame by frame with ImageDecoder (Chromium, recent Firefox).
 * Falls back to a single static frame elsewhere.
 */
export async function gifSource(source) {
  const blob =
    typeof Blob !== 'undefined' && source instanceof Blob ? source : await (await fetch(source)).blob();
  if (!canDecodeGif()) {
    const bmp = await createImageBitmap(blob);
    return staticSource(bmp);
  }
  const decoder = new ImageDecoder({ data: await blob.arrayBuffer(), type: 'image/gif' });
  await decoder.tracks.ready;
  await decoder.completed.catch(() => {});
  const track = decoder.tracks.selectedTrack;
  const frameCount = track?.frameCount || 1;
  const first = await decoder.decode({ frameIndex: 0 });
  const width = first.image.displayWidth;
  const height = first.image.displayHeight;
  let index = 0;
  let current = first.image;
  let playing = false;
  return {
    kind: 'gif',
    width,
    height,
    frameCount,
    async next() {
      if (!current) return null;
      const image = current;
      const duration = Math.max(20, (image.duration || 100000) / 1000); // µs → ms
      if (playing) {
        index = (index + 1) % frameCount;
        const res = await decoder.decode({ frameIndex: index }).catch(() => null);
        current = res?.image || current;
      }
      return { image, duration };
    },
    play() {
      playing = true;
    },
    pause() {
      playing = false;
    },
    destroy() {
      try {
        current?.close?.();
        decoder.close();
      } catch {
        /* already closed */
      }
    },
  };
}

export function staticSource(image) {
  const width = image.naturalWidth || image.displayWidth || image.width;
  const height = image.naturalHeight || image.displayHeight || image.height;
  return {
    kind: 'image',
    width,
    height,
    async next() {
      return { image, duration: 0 };
    },
    play() {},
    pause() {},
    destroy() {},
  };
}

/** Pick the right source for a URL / File / element. */
export async function openMedia(source) {
  const kind = guessMediaKind(source);
  if (kind === 'video') return videoSource(source);
  if (kind === 'gif') return gifSource(source);
  return null; // caller falls back to the still-image path
}
