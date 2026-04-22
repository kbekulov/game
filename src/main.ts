import * as pc from "playcanvas";

const canvas = document.getElementById("application") as HTMLCanvasElement;

const app = new pc.Application(canvas, {
  mouse: new pc.Mouse(document.body),
  touch: new pc.TouchDevice(document.body)
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();

window.addEventListener("resize", () => {
  app.resizeCanvas();
});

app.scene.ambientLight = new pc.Color(0.15, 0.16, 0.18);
app.scene.fog.type = pc.FOG_LINEAR;
app.scene.fog.color = new pc.Color(0.72, 0.66, 0.58);
app.scene.fog.start = 40;
app.scene.fog.end = 160;

const camera = new pc.Entity("camera");
camera.addComponent("camera", {
  clearColor: new pc.Color(0.83, 0.78, 0.69),
  farClip: 300,
  fov: 65
});
camera.setPosition(0, 1.8, 6);
app.root.addChild(camera);

const sun = new pc.Entity("sun");
sun.addComponent("light", {
  type: "directional",
  castShadows: true,
  intensity: 1.8,
  color: new pc.Color(1, 0.86, 0.68),
  shadowDistance: 80,
  shadowBias: 0.3,
  normalOffsetBias: 0.04
});
sun.setEulerAngles(45, 35, 0);
app.root.addChild(sun);

const groundMaterial = new pc.StandardMaterial();
groundMaterial.diffuse = new pc.Color(0.42, 0.33, 0.23);
groundMaterial.gloss = 0.2;
groundMaterial.update();

const blockMaterial = new pc.StandardMaterial();
blockMaterial.diffuse = new pc.Color(0.8, 0.72, 0.62);
blockMaterial.gloss = 0.18;
blockMaterial.update();

const ground = new pc.Entity("ground");
ground.addComponent("render", {
  type: "box",
  castShadows: false,
  receiveShadows: true
});
ground.setLocalScale(24, 1, 24);
ground.setLocalPosition(0, -0.5, 0);
app.root.addChild(ground);
for (const meshInstance of ground.render!.meshInstances) {
  meshInstance.material = groundMaterial;
}

const block = new pc.Entity("block");
block.addComponent("render", {
  type: "box",
  castShadows: true,
  receiveShadows: true
});
block.setLocalScale(3.6, 5.8, 3.6);
block.setLocalPosition(0, 2.9, -2.8);
app.root.addChild(block);
for (const meshInstance of block.render!.meshInstances) {
  meshInstance.material = blockMaterial;
}

const uiRoot = document.getElementById("ui-root");

if (uiRoot) {
  uiRoot.innerHTML = `
    <div class="boot-overlay">
      <div class="boot-card">
        <div class="boot-kicker">PlayCanvas Tactical Vertical Slice</div>
        <h1>Old Town Tactical</h1>
        <p>Scaffold complete. Gameplay systems and level construction are next.</p>
      </div>
    </div>
  `;
}
