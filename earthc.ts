const monomeGrid = require('monome-grid');
const easymidi = require('easymidi');
const output = new easymidi.Output('grid out', true);
const input = new easymidi.Input('grid in', true);

type twoDArray = Array<Array<number>>;
const createArray = (width: number, height: number): twoDArray => {
  let led: twoDArray = [];
  for (let y = 0; y < height; y++) {
    led[y] = [];
    for (let x = 0; x < width; x++) led[y][x] = 0;
  }
  return led;
};

const rows = [59, 55, 51, 47, 43, 39, 35, 31];
const calculate = (x: number, y: number) => rows[y] + x;

const noteOn = (i: number): void => {
  output.send('noteon', {
    note: i,
    velocity: 127,
    channel: 0,
  });
};

const noteOff = (i: number): void => {
  output.send('noteoff', {
    note: i,
    velocity: 127,
    channel: 0,
  });
};

async function run() {
  let grid = await monomeGrid(); // optionally pass in grid identifier

  let dirty = true;
  let led = createArray(16, 8);

  // set up key handler
  // toggle steps
  grid.key((x: number, y: number, s: number) => {
    if (s === 1) {
      led[y][x] = 15;
      noteOn(calculate(x, y))
      dirty = true;
    } else {
      led[y][x] = 0;
      noteOff(calculate(x, y))
      dirty = true;
    }
  });

  // refresh leds with a pattern
  let refresh = function() {
    if (dirty) {
      grid.refresh(led);
      dirty = false;
    }
  };

  // call refresh() function 60 times per second
  setInterval(refresh, 1000 / 60);
}

run();

export {}
// this is needed to stop typescript getting sad
