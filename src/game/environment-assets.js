import * as pc from "playcanvas";

const loadAsset = (app, url, type) =>
  new Promise((resolve, reject) => {
    app.assets.loadFromUrl(url, type, (err, asset) => {
      if (err) {
        reject(new Error(`Failed to load ${url}: ${err}`));
        return;
      }

      resolve(asset);
    });
  });

const getRenderComponents = (entity) => {
  const renders = entity.findComponents("render");

  if (entity.render && !renders.includes(entity.render)) {
    renders.unshift(entity.render);
  }

  return renders;
};

const applyMaterialToHierarchy = (entity, material) => {
  const renders = getRenderComponents(entity);

  for (const render of renders) {
    for (const meshInstance of render.meshInstances) {
      meshInstance.material = material;
    }
  }
};

const configureRepeatTexture = (texture) => {
  texture.addressU = pc.ADDRESS_REPEAT;
  texture.addressV = pc.ADDRESS_REPEAT;
  texture.anisotropy = 8;
};

const configureRenderHierarchy = (entity, castShadows, receiveShadows) => {
  const renders = getRenderComponents(entity);

  for (const render of renders) {
    render.castShadows = castShadows;
    render.receiveShadows = receiveShadows;
  }
};

const applyGroundDetail = async (app, groundEntity) => {
  const [diffuseAsset, normalAsset, roughAsset] = await Promise.all([
    loadAsset(app, "./assets/textures/ground/forest_leaves_02_diffuse_2k.jpg", "texture"),
    loadAsset(app, "./assets/textures/ground/forest_leaves_02_nor_gl_2k.png", "texture"),
    loadAsset(app, "./assets/textures/ground/forest_leaves_02_rough_2k.jpg", "texture")
  ]);

  const diffuseTexture = diffuseAsset.resource;
  const normalTexture = normalAsset.resource;
  const roughTexture = roughAsset.resource;

  configureRepeatTexture(diffuseTexture);
  configureRepeatTexture(normalTexture);
  configureRepeatTexture(roughTexture);

  const tiling = new pc.Vec2(28, 28);
  const material = new pc.StandardMaterial();
  material.diffuse = new pc.Color(0.94, 0.94, 0.94);
  material.diffuseMap = diffuseTexture;
  material.diffuseMapTiling = tiling.clone();
  material.normalMap = normalTexture;
  material.normalMapTiling = tiling.clone();
  material.bumpiness = 0.7;
  material.gloss = 0.28;
  material.glossMap = roughTexture;
  material.glossMapChannel = "r";
  material.glossMapTiling = tiling.clone();
  material.glossInvert = true;
  material.metalness = 0;
  material.update();

  applyMaterialToHierarchy(groundEntity, material);
};

const createDuskSkydome = async (app) => {
  const skyTextureAsset = await loadAsset(
    app,
    "./assets/textures/sky/qwantani_dusk_1_puresky.jpg",
    "texture"
  );
  const material = new pc.StandardMaterial();
  material.useLighting = false;
  material.useFog = false;
  material.diffuse = new pc.Color(0, 0, 0);
  material.emissive = new pc.Color(1, 1, 1);
  material.emissiveIntensity = 1.08;
  material.emissiveMap = skyTextureAsset.resource;
  material.cull = pc.CULLFACE_FRONT;
  material.depthWrite = false;
  material.update();

  const skydome = new pc.Entity("dusk-skydome");
  skydome.addComponent("render", {
    type: "sphere",
    castShadows: false,
    receiveShadows: false
  });
  app.root.addChild(skydome);
  skydome.setLocalPosition(0, 36, 0);
  skydome.setLocalScale(280, 280, 280);
  applyMaterialToHierarchy(skydome, material);
};

const placeModelEntity = (asset, parent, placement) => {
  const entity = asset.resource.instantiateRenderEntity({
    castShadows: placement.castShadows ?? true,
    receiveShadows: placement.receiveShadows ?? true
  });

  entity.name = placement.name;
  parent.addChild(entity);
  entity.setLocalPosition(placement.x, placement.y ?? 0, placement.z);
  entity.setLocalEulerAngles(0, placement.rotationY ?? 0, 0);
  entity.setLocalScale(placement.scale, placement.scale, placement.scale);
  configureRenderHierarchy(
    entity,
    placement.castShadows ?? true,
    placement.receiveShadows ?? true
  );
};

const addHeroTrees = async (app, parent) => {
  const asset = await loadAsset(app, "./assets/models/tree_small_02/tree_small_02_1k.gltf", "container");
  const placements = [
    { name: "hero-tree-trailhead", x: -48, z: 46, scale: 2.3, rotationY: 24 },
    { name: "hero-tree-hanging", x: -19, z: -22, scale: 2.55, rotationY: 196 },
    { name: "hero-tree-black-water", x: 28, z: 56, scale: 2.2, rotationY: 312 }
  ];

  for (const placement of placements) {
    placeModelEntity(asset, parent, placement);
  }
};

const addGroundProps = async (app, parent) => {
  const [stumpAsset, rootAsset] = await Promise.all([
    loadAsset(app, "./assets/models/tree_stump_02/tree_stump_02_1k.gltf", "container"),
    loadAsset(app, "./assets/models/root_cluster_02/root_cluster_02_1k.gltf", "container")
  ]);

  const stumpPlacements = [
    { name: "hero-stump-ash-camp", x: -10.8, y: 0.26, z: 22.4, scale: 1.34, rotationY: 32 },
    { name: "hero-stump-hanging-tree", x: -22.6, y: 0.28, z: -13.8, scale: 1.5, rotationY: 118 },
    { name: "hero-stump-witch-stones", x: -48.4, y: 0.24, z: -51.6, scale: 1.42, rotationY: 210 },
    { name: "hero-stump-hunter-blind", x: 39.4, y: 0.23, z: 28.1, scale: 1.2, rotationY: 284 },
    { name: "hero-stump-black-water", x: 26.8, y: 0.25, z: 69.5, scale: 1.26, rotationY: 46 },
    { name: "hero-stump-shack", x: 58.2, y: 0.25, z: -19.6, scale: 1.24, rotationY: 145 }
  ];

  for (const placement of stumpPlacements) {
    placeModelEntity(stumpAsset, parent, placement);
  }

  const rootPlacements = [
    { name: "hero-roots-trailhead", x: -55.2, y: 0.02, z: 52.8, scale: 4.2, rotationY: 18 },
    { name: "hero-roots-ash-camp", x: -13.2, y: 0.02, z: 14.6, scale: 3.7, rotationY: 92 },
    { name: "hero-roots-hanging-tree", x: -34.8, y: 0.02, z: -18.4, scale: 4.5, rotationY: 240 },
    { name: "hero-roots-witch-stones", x: -63.4, y: 0.02, z: -39.4, scale: 4.2, rotationY: 306 },
    { name: "hero-roots-black-water", x: 27.2, y: 0.02, z: 74.3, scale: 4.8, rotationY: 154 }
  ];

  for (const placement of rootPlacements) {
    placeModelEntity(rootAsset, parent, placement);
  }
};

export const enhanceForestEnvironment = async (app, { groundEntity }) => {
  const detailRoot = new pc.Entity("forest-detail-assets");
  app.root.addChild(detailRoot);

  const results = await Promise.allSettled([
    createDuskSkydome(app),
    applyGroundDetail(app, groundEntity),
    addHeroTrees(app, detailRoot),
    addGroundProps(app, detailRoot)
  ]);

  const failed = results.filter((result) => result.status === "rejected");

  for (const result of failed) {
    console.warn(result.reason);
  }

  return {
    failedCount: failed.length
  };
};
