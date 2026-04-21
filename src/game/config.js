export const PLAYER_HEIGHT = 1.65;
export const PLAYER_START = { x: -246, y: PLAYER_HEIGHT, z: 246 };
export const FOREST_HALF_EXTENT = 320;
export const MOVE_SPEED = 10.5;
export const SPRINT_MULTIPLIER = 1.65;
export const JUMP_VELOCITY = 5.25;
export const GRAVITY = 17.5;
export const MOUSE_SENSITIVITY = 0.11;
export const MAX_PITCH = 78;

export const FOREST_LANDMARKS = [
  {
    label: "Trailhead Lantern",
    position: { x: -246, z: 246 },
    radius: 24,
    omen: "Fading Ember",
    status: "The last reliable light hangs over the trailhead, and even here the forest feels like it is listening."
  },
  {
    label: "Ash Camp",
    position: { x: -178, z: 198 },
    radius: 24,
    omen: "Cooling Ash",
    status: "A cold ring of stones and half-buried logs sits where campers must have left in a hurry."
  },
  {
    label: "Split Creek",
    position: { x: -104, z: 126 },
    radius: 22,
    omen: "Water Under Soil",
    status: "The trail forks beside a dry creek bed that still sounds wet somewhere below the dirt."
  },
  {
    label: "Grave Path",
    position: { x: -8, z: 74 },
    radius: 22,
    omen: "Bent Markers",
    status: "Narrow path markers lean inward here as if they are trying to hide what lies deeper in."
  },
  {
    label: "Hanging Tree",
    position: { x: -112, z: 18 },
    radius: 24,
    omen: "Watching Branches",
    status: "A dead tree dominates the slope here, its limbs bent like hooks over the trail."
  },
  {
    label: "Hunter's Blind",
    position: { x: 112, z: 168 },
    radius: 24,
    omen: "Thin Light",
    status: "A rotting blind watches the game trails from above, empty except for clawed grooves in the wood."
  },
  {
    label: "Black Water",
    position: { x: 158, z: 214 },
    radius: 26,
    omen: "Heavy Silence",
    status: "The water reflects a sky darker than the real one and swallows every sound that reaches it."
  },
  {
    label: "Witch Stones",
    position: { x: -214, z: -144 },
    radius: 28,
    omen: "Static in the Air",
    status: "Standing stones choke the wind and make every footstep sound like a trespass."
  },
  {
    label: "Boarded Shack",
    position: { x: 186, z: -16 },
    radius: 24,
    omen: "Splinter Echo",
    status: "The shack is boarded from the outside, which would be less troubling if the door kept flexing anyway."
  },
  {
    label: "Collapsed Bridge",
    position: { x: 46, z: -152 },
    radius: 22,
    omen: "Dropped Footsteps",
    status: "The old timber crossing is half gone, leaving a snapped span over a ditch full of dark water."
  },
  {
    label: "Radio Tower Base",
    position: { x: -24, z: -246 },
    radius: 28,
    omen: "Dead Signal",
    status: "A skeletal tower base rises out of the pines, and the air around it hums with nothing human."
  }
];

export const FOREST_PATHS = [
  {
    start: { x: -246, z: 246 },
    end: { x: -178, z: 198 },
    width: 6.2
  },
  {
    start: { x: -178, z: 198 },
    end: { x: -104, z: 126 },
    width: 5.8
  },
  {
    start: { x: -104, z: 126 },
    end: { x: -8, z: 74 },
    width: 5.2
  },
  {
    start: { x: -178, z: 198 },
    end: { x: -112, z: 18 },
    width: 4.9
  },
  {
    start: { x: -8, z: 74 },
    end: { x: -112, z: 18 },
    width: 5.1
  },
  {
    start: { x: -112, z: 18 },
    end: { x: -214, z: -144 },
    width: 4.9
  },
  {
    start: { x: -8, z: 74 },
    end: { x: 112, z: 168 },
    width: 5.1
  },
  {
    start: { x: -104, z: 126 },
    end: { x: 112, z: 168 },
    width: 4.6
  },
  {
    start: { x: 112, z: 168 },
    end: { x: 158, z: 214 },
    width: 4.8
  },
  {
    start: { x: -8, z: 74 },
    end: { x: 186, z: -16 },
    width: 5.2
  },
  {
    start: { x: 112, z: 168 },
    end: { x: 186, z: -16 },
    width: 4.5
  },
  {
    start: { x: 186, z: -16 },
    end: { x: 46, z: -152 },
    width: 5.1
  },
  {
    start: { x: 46, z: -152 },
    end: { x: -24, z: -246 },
    width: 4.8
  }
];
