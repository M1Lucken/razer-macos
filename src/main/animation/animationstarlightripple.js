import { RazerDeviceAnimation } from './animation';
import { KEY_MAPPING } from './keymapping';

const BASE = [210, 210, 210];
const RIPPLE = [0, 255, 0];
const STAR_COLORS = [
  [255, 0, 0],
  [255, 80, 0],
  [255, 200, 0],
  [0, 255, 0],
  [0, 255, 180],
  [0, 90, 255],
  [170, 0, 255],
  [255, 0, 170],
];

function mix(from, to, amount) {
  return [
    Math.round(from[0] + (to[0] - from[0]) * amount),
    Math.round(from[1] + (to[1] - from[1]) * amount),
    Math.round(from[2] + (to[2] - from[2]) * amount),
  ];
}

export class RazerAnimationStarlightRipple extends RazerDeviceAnimation {
  constructor(device, featureConfiguration) {
    super();
    this.device = device;
    this.nRows = featureConfiguration.rows;
    this.nCols = featureConfiguration.cols;
    this.keys = Object.values(KEY_MAPPING).filter((position) => position[0] < this.nRows && position[1] < this.nCols);
    this.interval = null;
    this.keydown = null;
    try {
      this.ioHook = require('iohook');
    } catch (error) {
      this.ioHook = null;
    }
  }

  start() {
    const refreshMs = 50;
    const starLife = 1.4;
    const maxStars = 16;
    const eventDuration = 0.9;
    const speed = 18;
    const width = 1.8;
    let stars = [];
    let keyEvents = [];
    let nextSpawn = 0;

    if (this.ioHook) {
      try {
        this.ioHook.start();
        this.keydown = (event) => {
          if (!(event.keycode in KEY_MAPPING)) {
            return;
          }
          const [rowIdx, colIdx] = KEY_MAPPING[event.keycode];
          if (rowIdx >= this.nRows || colIdx >= this.nCols) {
            return;
          }
          keyEvents.push({
            rowIdx,
            colIdx,
            startTime: Date.now() / 1000,
          });
        };
        this.ioHook.on('keydown', this.keydown);
      } catch (error) {
        this.ioHook = null;
      }
    }

    this.interval = setInterval(() => {
      const now = Date.now() / 1000;
      stars = stars.filter((star) => star.start + starLife > now);
      keyEvents = keyEvents.filter((event) => event.startTime + eventDuration > now);

      if (now >= nextSpawn && stars.length < maxStars && this.keys.length > 0) {
        const [row, col] = this.keys[Math.floor(Math.random() * this.keys.length)];
        stars.push({
          row,
          col,
          start: now,
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        });
        nextSpawn = now + 0.08 + Math.random() * 0.18;
      }

      const matrix = Array(this.nRows).fill().map(() => Array(this.nCols).fill(BASE));

      for (const star of stars) {
        const progress = (now - star.start) / starLife;
        const fade = Math.sin(Math.PI * progress);
        matrix[star.row][star.col] = mix(BASE, star.color, fade);
      }

      for (let row = 0; row < this.nRows; row++) {
        for (let col = 0; col < this.nCols; col++) {
          for (const event of keyEvents) {
            const radius = (now - event.startTime) * speed;
            const distance = Math.hypot(event.rowIdx - row, event.colIdx - col);
            if (radius - width <= distance && distance <= radius) {
              matrix[row][col] = RIPPLE;
              break;
            }
          }
        }
      }

      for (let row = 0; row < this.nRows; row++) {
        this.device.setCustomFrame(new Uint8Array([row, 0, this.nCols - 1, ...matrix[row].flat()]));
      }
      this.device.setModeCustom();
    }, refreshMs);
  }

  stop() {
    if (this.interval != null) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.ioHook && this.keydown) {
      if (typeof this.ioHook.removeListener === 'function') {
        this.ioHook.removeListener('keydown', this.keydown);
      }
      this.keydown = null;
      this.ioHook.stop();
    }
  }

  destroy() {
    this.stop();
    if (this.ioHook) {
      this.ioHook.unload();
      this.ioHook = null;
    }
  }
}
