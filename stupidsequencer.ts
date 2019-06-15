const monomeGrid = require('monome-grid');
const easymidi = require('easymidi');
const output = new easymidi.Output('grid out', true);
const input = new easymidi.Input('grid in', true);

const scale: Array<Array<number>> = [
  [94, 96, 97],
  [85, 88, 89, 90, 93, 94],
  [76, 77, 78, 81, 82, 84],
  [65, 66, 69, 70, 72, 73],
  [54, 57, 58, 60, 61, 64],
  [45, 46, 48, 49, 52, 53],
];

let notes: Array<number> = [];

let reversing = false;
const noteOn = (i: number): void => {
  let note;
  if (reversing) {
    note = scale[i].pop();
    scale[i].unshift(note);
  } else {
    note = scale[i].shift();
    scale[i].push(note);
  }

  notes.push(note);
  output.send('noteon', {
    note: note,
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

type twoDArray = Array<Array<number>>;
const createArray = (width: number, height: number): twoDArray => {
  let led: twoDArray = [];
  for (let y = 0; y < height; y++) {
    led[y] = [];
    for (let x = 0; x < width; x++) led[y][x] = 0;
  }
  return led;
};

// stuff for the timer
let timer = 0;
let play_head = 0;
const STEP_TIME = 10;
let cutting = false;
let nextPosition = 0;

// for looping
let keys_held = 0;
let key_last = 0;
let loop_start = 0;
let loop_end = 15;

// for pausing
let paused = false;

async function run() {
  let grid = await monomeGrid(); // optionally pass in grid identifier

  // initialize 2-dimensional led array
  let steps = createArray(16, 6);

  let dirty = true;

  // set up key handler
  // toggle steps
  grid.key((x: number, y: number, s: number) => {
    keys_held = keys_held + s * 2 - 1;

    if (s == 1 && y < 6) {
      steps[y][x] ^= 1;
      dirty = true;
    } else if (s === 1 && y === 7) {
      if (keys_held === 1) {
        cutting = true;
        nextPosition = x;
        key_last = x;
      } else if (keys_held === 2) {
        loop_start = key_last;
        loop_end = x;
      }
    } else if (s === 1 && y === 6 && x === 0) {
      paused = !paused;
      dirty = true;
    } else if (s === 1 && y === 6 && x === 1) {
      reversing = !reversing;
      dirty = true;
    }
  });

  // refresh leds with a pattern
  let refresh = function() {
    if (paused) {
    } else if (timer === STEP_TIME) {
      if (cutting) {
        play_head = nextPosition;
      } else if (play_head === loop_end) {
        play_head = loop_start;
      } else {
        play_head = (play_head + 1) % 16;
      }
      cutting = false;
      timer = 0;
      dirty = true;
      // clear all the notes we played on the last step
      // send midi offs, then empty the buffer
      notes.forEach(n => {
        noteOff(n);
      });
      notes = [];

      // save notes we are about to play
      // send midi ons
      steps.map((row, idx) => {
        if (row[play_head] === 1) {
          noteOn(idx);
        }
      });
    } else {
      timer++;
    }

    if (dirty) {
      let led = createArray(16, 8);
      let highlight = 0;

      steps.map((row, idy) => {
        row.map((state, idx) => {
          if (idx === play_head) {
            highlight = 4;
          } else {
            highlight = 0;
          }

          led[idy][idx] = state * 11 + highlight;
        });
      });

      led[7][loop_start] = 11;
      led[7][loop_end] = 11;

      if (paused) {
        led[6][0] = 15;
      }

      if (reversing) {
        led[6][1] = 15;
      }

      grid.refresh(led);
      dirty = false;
    }
  };

  // call refresh() function 60 times per second
  setInterval(refresh, 1000 / 60);
}

run();

// drunk playback of the different scale patterns?
// ways to control the scale patterns?
// send each row to a different midi channel?
