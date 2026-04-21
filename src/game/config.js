export const PLAYER_HEIGHT = 1.65;
export const PLAYER_START = { x: -62, y: PLAYER_HEIGHT, z: 58 };
export const FOREST_HALF_EXTENT = 96;
export const MOVE_SPEED = 10.5;
export const MOUSE_SENSITIVITY = 0.11;
export const MAX_PITCH = 78;

export const FOREST_LANDMARKS = [
  {
    label: "Trailhead Lantern",
    position: { x: -62, z: 58 },
    radius: 18,
    omen: "Fading Ember",
    status: "The last warm light still reaches this far, but the grove is already leaning in."
  },
  {
    label: "Ash Camp",
    position: { x: -6, z: 18 },
    radius: 18,
    omen: "Cooling Ash",
    status: "A cold campfire waits in a clearing that feels too deliberate to be abandoned."
  },
  {
    label: "Hanging Tree",
    position: { x: -28, z: -10 },
    radius: 18,
    omen: "Watching Branches",
    status: "One crooked tree dominates the slope, its dead limbs catching the last light like hooks."
  },
  {
    label: "Witch Stones",
    position: { x: -56, z: -46 },
    radius: 21,
    omen: "Static in the Air",
    status: "Standing stones choke the wind here and make every footstep sound like a trespass."
  },
  {
    label: "Hunter's Blind",
    position: { x: 44, z: 34 },
    radius: 18,
    omen: "Thin Light",
    status: "A rotting platform watches the brush from above, empty except for old scratches in the wood."
  },
  {
    label: "Boarded Shack",
    position: { x: 52, z: -28 },
    radius: 18,
    omen: "Splinter Echo",
    status: "Boards have been nailed over the shack from the outside, which would be less troubling if the door kept moving."
  },
  {
    label: "Black Water",
    position: { x: 34, z: 66 },
    radius: 19,
    omen: "Heavy Silence",
    status: "The water here reflects a sky darker than the one above you."
  }
];

export const FOREST_PATHS = [
  {
    start: { x: -62, z: 58 },
    end: { x: -6, z: 18 },
    width: 5.6
  },
  {
    start: { x: -6, z: 18 },
    end: { x: -28, z: -10 },
    width: 4.8
  },
  {
    start: { x: -28, z: -10 },
    end: { x: -56, z: -46 },
    width: 4.5
  },
  {
    start: { x: -6, z: 18 },
    end: { x: 44, z: 34 },
    width: 4.9
  },
  {
    start: { x: -6, z: 18 },
    end: { x: 52, z: -28 },
    width: 4.9
  },
  {
    start: { x: 44, z: 34 },
    end: { x: 34, z: 66 },
    width: 4.2
  }
];
