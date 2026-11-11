import { RazerDeviceAnimation } from './animation';
import { KEY_MAPPING } from './keymapping';

export class RazerAnimationRipple extends RazerDeviceAnimation {

constructor(device, featureConfiguration, color, backgroundColor = [0, 0, 0]) {
    super();
    this.KEY_MAPPING = KEY_MAPPING;
    this.rippleEffectInterval = null;

    this.color = color;
    this.backgroundColor = backgroundColor != null ? backgroundColor : [0, 0, 0];

    this.device = device;
    this.ioHook = require('iohook');

    this.nRows = featureConfiguration.rows;
    this.nCols = featureConfiguration.cols;
  }

  start() {
    this.ioHook.start();

    const refreshRate = 0.05; // in seconds
    const eventDuration = 1; // in seconds
    const speed = 20; // number of keys per second
    const width = 2; // number of keys

    // initialization
    let matrix = Array(this.nRows)
      .fill()
      .map(() => Array(this.nCols).fill(this.backgroundColor));
    for (let i = 0; i < this.nRows; i++) {
      let row = [i, 0, this.nCols - 1, ...matrix[i].flat()];
      this.device.setCustomFrame(new Uint8Array(row))
    }
    this.device.setModeCustom();
    let keyEvents = [];

    // keyboard listener
    this.ioHook.on('keydown', (event) => {
      if (!(event.keycode in this.KEY_MAPPING)) return;
      const rowIdx = this.KEY_MAPPING[event.keycode][0];
      const colIdx = this.KEY_MAPPING[event.keycode][1];

      keyEvents.push({
        rowIdx,
        colIdx,
        startTime: Date.now() / 1000,
      });
    });

    this.rippleEffectInterval = setInterval(() => {
      keyEvents = keyEvents.filter((event) => event.startTime + eventDuration > Date.now() / 1000);

      // clear keyboard
      matrix = Array(this.nRows)
        .fill()
        .map(() => Array(this.nCols).fill(this.backgroundColor));

      // set color
      for (let i = 0; i < this.nRows; i++) {
        for (let j = 0; j < this.nCols; j++) {
          for (let event of keyEvents) {
            const radius = (Date.now() / 1000 - event.startTime) * speed;
            const distance = Math.sqrt(
              Math.pow(event.rowIdx - i, 2) + Math.pow(event.colIdx - j, 2),
            );
            if (radius - width <= distance && distance <= radius) {
              matrix[i][j] = this.color;
              break;
            }
          }
        }
      }

      // set ripple effect
      for (let i = 0; i < this.nRows; i++) {
        let row = [i, 0, this.nCols - 1, ...matrix[i].flat()];
        this.device.setCustomFrame(new Uint8Array(row));
      }
      this.device.setModeCustom();
    }, refreshRate);
  }

  stop() {
    clearTimeout(this.rippleEffectInterval);
    this.ioHook.stop();
  }

  destroy() {
    this.stop();
    this.ioHook.unload();
  }
}