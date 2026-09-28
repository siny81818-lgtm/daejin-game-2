import * as THREE from 'three';
import { MoleType, HoleState, MoleInfo } from '../types/game';
import { sound } from '../services/audio';

export interface MoleSceneCallbacks {
  onMoleHit: (mole: MoleInfo, hitX: number, hitY: number) => void;
  onMiss: () => void;
  onScreenCoords: (screenX: number, screenY: number, text: string, color: string) => void;
}

export class MoleScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private callbacks: MoleSceneCallbacks;

  // Scene objects
  private holes: Array<{
    position: THREE.Vector3;
    group: THREE.Group;
    rimMesh: THREE.Mesh;
    innerMesh: THREE.Mesh;
    moleGroup: THREE.Group;
    moleBody: THREE.Mesh;
    moleType: MoleType;
    state: HoleState;
    animProgress: number;
    lifetime: number;
    maxLifetime: number;
    accessories: THREE.Group;
    starsGroup: THREE.Group;
    hitsRequired: number;
    hitsReceived: number;
    scoreValue: number;
  }> = [];

  private hammerGroup: THREE.Group;
  private hammerHead: THREE.Mesh;
  private hammerPivot: THREE.Group;
  private swingStartPos: THREE.Vector3 = new THREE.Vector3(-4.0, 3.4, -1.2);
  private hammerTargetPos: THREE.Vector3 = new THREE.Vector3(-4.0, 3.4, -1.2);
  private hammerCurrentPos: THREE.Vector3 = new THREE.Vector3(-4.0, 3.4, -1.2);
  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  private defaultHammerIdlePos: THREE.Vector3 = new THREE.Vector3(-4.0, 3.4, -1.2);
  private hammerHeadAngle: number = 0;
  // Natural isometric idle angle matching Image 2:
  // Handle points down-left (-46°), head sits at top-right, barrel slants diagonally top-left to bottom-right
  private baseHammerRot: THREE.Euler = new THREE.Euler(0.46, 0.22, -0.80);

  // Particles
  private particles: Array<{
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotSpeed: THREE.Vector3;
    life: number;
    maxLife: number;
  }> = [];

  // Screen shake
  private shakeIntensity: number = 0;
  private baseCameraPos: THREE.Vector3 = new THREE.Vector3(0, 14, 13);

  // Animation frame
  private animFrameId: number | null = null;
  private lastTime: number = performance.now();
  private isRunning: boolean = true;

  constructor(container: HTMLElement, callbacks: MoleSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x84cc16); // Vibrant grassy green matching photo
    this.scene.fog = new THREE.Fog(0x84cc16, 25, 45);

    // 2. Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.updateCameraForViewport(width, height);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // 4. Raycaster & Mouse
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    // 5. Lights
    this.setupLighting();

    // 6. Environment & 9 Holes
    this.createGround();
    this.createScatteredRocks();
    this.createNineHoles();

    // 7. Hammer
    this.hammerGroup = new THREE.Group();
    this.hammerPivot = new THREE.Group();
    this.hammerHead = new THREE.Mesh();
    this.createHammer();

    // 8. Event Listeners
    this.setupEventListeners();

    // 9. Start Loop
    this.lastTime = performance.now();
    this.renderLoop();
  }

  private setupLighting() {
    // Soft ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    // Hemisphere light (sky lime, ground warm grass)
    const hemiLight = new THREE.HemisphereLight(0xe4f9b8, 0x5a9a14, 0.5);
    this.scene.add(hemiLight);

    // Directional light casting soft shadows
    const dirLight = new THREE.DirectionalLight(0xfffbf0, 1.1);
    dirLight.position.set(10, 20, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 5;
    dirLight.shadow.camera.far = 40;
    const shadowD = 10;
    dirLight.shadow.camera.left = -shadowD;
    dirLight.shadow.camera.right = shadowD;
    dirLight.shadow.camera.top = shadowD;
    dirLight.shadow.camera.bottom = -shadowD;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    // Subtle back rim light for low-poly specular edge definition
    const rimLight = new THREE.DirectionalLight(0xc7f9cc, 0.45);
    rimLight.position.set(-12, 10, -10);
    this.scene.add(rimLight);
  }

  private createGround() {
    // Large ground plane
    const groundGeo = new THREE.PlaneGeometry(60, 60, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x82c81e,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private createScatteredRocks() {
    // Scattered low-poly white/light-grey rocks matching the reference photo
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xedf2f7,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
    });

    // Rock coordinate presets matching the photo layout
    const rockData = [
      { pos: [-3.8, 0.25, -2.8], scale: 0.55 },
      { pos: [-2.2, 0.35, -3.4], scale: 0.7 },
      { pos: [-1.2, 0.25, -3.0], scale: 0.45 },
      { pos: [3.9, 0.3, -1.2], scale: 0.6 },
      { pos: [-4.6, 0.3, 0.8], scale: 0.5 },
      { pos: [-1.8, 0.35, 0.4], scale: 0.65 },
      { pos: [4.9, 0.3, 1.4], scale: 0.55 },
      { pos: [-4.1, 0.2, 3.4], scale: 0.45 },
      { pos: [3.6, 0.25, 4.3], scale: 0.48 },
    ];

    rockData.forEach((data) => {
      // Dodecahedron with random vertex noise creates the lovely faceted rock look
      const geo = new THREE.DodecahedronGeometry(data.scale, 0);
      const mesh = new THREE.Mesh(geo, rockMat);
      mesh.position.set(data.pos[0], data.pos[1], data.pos[2]);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });
  }

  private createNineHoles() {
    // 3x3 diamond/slanted grid layout matching reference photo
    // The photo has 3 rows:
    // Row 0: 3 holes (-2.7, -1.8), (0, -1.6), (2.7, -1.8)
    // Row 1: 3 holes (-3.4, 0.3), (-0.7, 0.4), (2.0, 0.3)
    // Row 2: 3 holes (-2.4, 2.5), (0.3, 2.6), (3.0, 2.5)
    const holeCoords = [
      [-2.6, 0, -2.1],
      [0.1, 0, -2.2],
      [2.7, 0, -1.6],

      [-3.4, 0, 0.3],
      [-0.7, 0, 0.3],
      [2.0, 0, 0.8],

      [-2.4, 0, 2.6],
      [0.3, 0, 2.7],
      [3.0, 0, 3.1],
    ];

    // Dirt rim material (warm faceted 8-sided octagon)
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x8a5b39,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });

    // Dark black/brown hole bottom
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x14100d,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
    });

    holeCoords.forEach((coord, index) => {
      const group = new THREE.Group();
      group.position.set(coord[0], coord[1], coord[2]);

      // 1. Octagonal dirt rim
      const rimGeo = new THREE.CylinderGeometry(1.22, 1.48, 0.38, 8);
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.position.y = 0.19;
      rimMesh.castShadow = true;
      rimMesh.receiveShadow = true;
      group.add(rimMesh);

      // 2. Dark hole interior
      const innerGeo = new THREE.CylinderGeometry(0.88, 0.88, 0.08, 12);
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.position.y = 0.22;
      innerMesh.receiveShadow = true;
      group.add(innerMesh);

      // 3. Mole Character Group
      const moleGroup = new THREE.Group();
      moleGroup.position.set(0, -1.1, 0); // start submerged below hole
      group.add(moleGroup);

      // Build Mole Body Mesh (faceted cone/cylinder)
      const moleMat = new THREE.MeshStandardMaterial({
        color: 0xb5733d,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true,
      });

      // Body: slightly tapered dome
      const bodyGeo = new THREE.CylinderGeometry(0.62, 0.78, 1.25, 9);
      const moleBody = new THREE.Mesh(bodyGeo, moleMat);
      moleBody.position.y = 0.65;
      moleBody.castShadow = true;
      moleGroup.add(moleBody);

      // Snout / Nose bridge (peach/cream)
      const snoutMat = new THREE.MeshStandardMaterial({
        color: 0xfce4d6,
        roughness: 0.7,
        metalness: 0.05,
        flatShading: true,
      });
      const snoutGeo = new THREE.SphereGeometry(0.24, 7, 7);
      snoutGeo.scale(1, 0.8, 1.1);
      const snout = new THREE.Mesh(snoutGeo, snoutMat);
      snout.position.set(0, 0.72, 0.62);
      moleGroup.add(snout);

      // Black nose tip
      const noseTipMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const noseTipGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const noseTip = new THREE.Mesh(noseTipGeo, noseTipMat);
      noseTip.position.set(0, 0.77, 0.84);
      moleGroup.add(noseTip);

      // Black dot eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const eyeGeo = new THREE.SphereGeometry(0.07, 6, 6);

      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.25, 0.94, 0.54);
      moleGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.25, 0.94, 0.54);
      moleGroup.add(rightEye);

      // Whiskers (thin dark cylinders/lines)
      const whiskerMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
      const whiskerGeo = new THREE.BoxGeometry(0.35, 0.03, 0.02);

      const whiskerL1 = new THREE.Mesh(whiskerGeo, whiskerMat);
      whiskerL1.position.set(-0.42, 0.74, 0.58);
      whiskerL1.rotation.z = 0.15;
      moleGroup.add(whiskerL1);

      const whiskerL2 = new THREE.Mesh(whiskerGeo, whiskerMat);
      whiskerL2.position.set(-0.42, 0.68, 0.58);
      whiskerL2.rotation.z = -0.12;
      moleGroup.add(whiskerL2);

      const whiskerR1 = new THREE.Mesh(whiskerGeo, whiskerMat);
      whiskerR1.position.set(0.42, 0.74, 0.58);
      whiskerR1.rotation.z = -0.15;
      moleGroup.add(whiskerR1);

      const whiskerR2 = new THREE.Mesh(whiskerGeo, whiskerMat);
      whiskerR2.position.set(0.42, 0.68, 0.58);
      whiskerR2.rotation.z = 0.12;
      moleGroup.add(whiskerR2);

      // Two cute paws resting on rim
      const pawGeo = new THREE.SphereGeometry(0.16, 6, 6);
      pawGeo.scale(1.2, 0.7, 1);
      const pawL = new THREE.Mesh(pawGeo, snoutMat);
      pawL.position.set(-0.45, 0.38, 0.62);
      moleGroup.add(pawL);

      const pawR = new THREE.Mesh(pawGeo, snoutMat);
      pawR.position.set(0.45, 0.38, 0.62);
      moleGroup.add(pawR);

      // Accessories Group (Pickaxe, Goggles, Hardhat, Ruff Collar)
      const accessories = new THREE.Group();
      moleGroup.add(accessories);

      // Dizzy Stars Group (appears when mole is hit)
      const starsGroup = new THREE.Group();
      starsGroup.position.set(0, 1.45, 0);
      starsGroup.visible = false;

      const starMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      for (let s = 0; s < 3; s++) {
        const starMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), starMat);
        const angle = (s / 3) * Math.PI * 2;
        starMesh.position.set(Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4);
        starsGroup.add(starMesh);
      }
      moleGroup.add(starsGroup);

      // Store in holes array
      this.holes.push({
        position: group.position,
        group,
        rimMesh,
        innerMesh,
        moleGroup,
        moleBody,
        moleType: 'standard',
        state: 'hidden',
        animProgress: 0,
        lifetime: 0,
        maxLifetime: 1.5,
        accessories,
        starsGroup,
        hitsRequired: 1,
        hitsReceived: 0,
        scoreValue: 100,
      });

      this.scene.add(group);
    });
  }

  private createHammer() {
    // Mallet materials matching Image 1: dark slate / charcoal blue-grey with faceted matte finish
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // dark slate blue-grey from Image 1
      roughness: 0.65,
      metalness: 0.35,
      flatShading: true,
    });

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // darker raised collar bands
      roughness: 0.6,
      metalness: 0.45,
      flatShading: true,
    });

    const capMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // beveled end caps
      roughness: 0.7,
      metalness: 0.25,
      flatShading: true,
    });

    // Handle matching Image 2: warm dark hardwood shaft + charcoal grip wrap
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e18, // warm dark walnut wood
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    });

    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x182026, // charcoal wrapped grip sleeve
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    const pommelMat = new THREE.MeshStandardMaterial({
      color: 0x361f10, // dark wood pommel
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    });

    this.hammerPivot = new THREE.Group();

    // 1. Central Barrel Cylinder (11-sided faceted cylinder along X axis)
    const barrelGeo = new THREE.CylinderGeometry(0.64, 0.64, 1.62, 11);
    this.hammerHead = new THREE.Mesh(barrelGeo, barrelMat);
    this.hammerHead.rotation.z = Math.PI / 2;
    this.hammerHead.castShadow = true;
    this.hammerPivot.add(this.hammerHead);

    // 2. Two Raised Collar Rings
    const ringGeo = new THREE.CylinderGeometry(0.70, 0.70, 0.20, 11);

    const ringFront = new THREE.Mesh(ringGeo, ringMat);
    ringFront.rotation.z = Math.PI / 2;
    ringFront.position.set(0.46, 0, 0);
    ringFront.castShadow = true;
    this.hammerPivot.add(ringFront);

    const ringRear = new THREE.Mesh(ringGeo, ringMat);
    ringRear.rotation.z = Math.PI / 2;
    ringRear.position.set(-0.46, 0, 0);
    ringRear.castShadow = true;
    this.hammerPivot.add(ringRear);

    // 3. Beveled End Caps
    const capGeo = new THREE.CylinderGeometry(0.56, 0.64, 0.08, 11);

    const capFront = new THREE.Mesh(capGeo, capMat);
    capFront.rotation.z = -Math.PI / 2;
    capFront.position.set(0.84, 0, 0);
    capFront.castShadow = true;
    this.hammerPivot.add(capFront);

    const capRear = new THREE.Mesh(capGeo, capMat);
    capRear.rotation.z = Math.PI / 2;
    capRear.position.set(-0.84, 0, 0);
    capRear.castShadow = true;
    this.hammerPivot.add(capRear);

    // 4. Sturdy Handle extending down along -Y
    const handleGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.1, 8);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, -1.05, 0);
    handle.castShadow = true;
    this.hammerPivot.add(handle);

    // 5. Grip Sleeve on lower handle
    const gripGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.72, 8);
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -1.65, 0);
    grip.castShadow = true;
    this.hammerPivot.add(grip);

    // 6. Rounded Bottom Pommel Cap
    const pommelGeo = new THREE.SphereGeometry(0.17, 6, 6);
    const pommel = new THREE.Mesh(pommelGeo, pommelMat);
    pommel.position.set(0, -2.12, 0);
    pommel.castShadow = true;
    this.hammerPivot.add(pommel);

    this.hammerGroup.add(this.hammerPivot);
    this.hammerGroup.position.copy(this.defaultHammerIdlePos);
    this.scene.add(this.hammerGroup);

    this.applyHammerOrientation();
  }

  /**
   * Rotate hammer head orientation by 90 degrees or set angle
   */
  public rotateHammerHead(): number {
    this.hammerHeadAngle = (this.hammerHeadAngle + Math.PI / 2) % (Math.PI * 2);
    this.applyHammerOrientation();
    return Math.round((this.hammerHeadAngle * 180) / Math.PI);
  }

  public getHammerAngle(): number {
    return Math.round((this.hammerHeadAngle * 180) / Math.PI);
  }

  private applyHammerOrientation() {
    if (this.isSwinging) return;
    // Set exact angle matching Image 2:
    // Handle points down-left, head sits at top-right, barrel slants from top-left to bottom-right!
    this.hammerPivot.rotation.set(
      this.baseHammerRot.x,
      this.baseHammerRot.y,
      this.baseHammerRot.z + this.hammerHeadAngle
    );
  }

  /**
   * Builds custom 3D low-poly accessories onto a mole depending on its type
   */
  private configureMoleAccessories(holeIdx: number, type: MoleType) {
    const hole = this.holes[holeIdx];
    hole.moleType = type;

    // Clear old accessories
    while (hole.accessories.children.length > 0) {
      hole.accessories.remove(hole.accessories.children[0]);
    }

    // Default mole color
    const moleMat = hole.moleBody.material as THREE.MeshStandardMaterial;
    moleMat.color.setHex(0xb5733d);
    moleMat.metalness = 0.05;
    moleMat.roughness = 0.85;

    if (type === 'miner') {
      hole.scoreValue = 150;
      // 1. Pickaxe in right hand (wooden shaft + steel angled head)
      const pickaxeGroup = new THREE.Group();
      pickaxeGroup.position.set(-0.48, 0.8, 0.6);
      pickaxeGroup.rotation.set(0.2, 0.4, 0.3);

      // Shaft
      const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6);
      const shaftMat = new THREE.MeshStandardMaterial({ color: 0x995d3f, roughness: 0.8, flatShading: true });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      pickaxeGroup.add(shaft);

      // Head
      const pickHeadGeo = new THREE.ConeGeometry(0.12, 0.7, 5);
      const pickHeadMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.3, metalness: 0.7, flatShading: true });
      const pickHead1 = new THREE.Mesh(pickHeadGeo, pickHeadMat);
      pickHead1.position.set(0, 0.4, 0);
      pickHead1.rotation.z = Math.PI / 2.2;
      pickaxeGroup.add(pickHead1);

      const pickHead2 = new THREE.Mesh(pickHeadGeo, pickHeadMat);
      pickHead2.position.set(0, 0.4, 0);
      pickHead2.rotation.z = -Math.PI / 2.2;
      pickaxeGroup.add(pickHead2);

      hole.accessories.add(pickaxeGroup);

    } else if (type === 'goggle') {
      hole.scoreValue = 200;
      // 2. Thick black round goggles/glasses + white frilly ruff collar
      const glassesGroup = new THREE.Group();
      glassesGroup.position.set(0, 0.94, 0.58);

      const frameMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.1, metalness: 0.8 });

      // Left eye ring
      const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 12), frameMat);
      ringL.position.set(-0.25, 0, 0);
      glassesGroup.add(ringL);

      // Right eye ring
      const ringR = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 12), frameMat);
      ringR.position.set(0.25, 0, 0);
      glassesGroup.add(ringR);

      // Glasses bridge
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.03), frameMat);
      bridge.position.set(0, 0, 0);
      glassesGroup.add(bridge);

      hole.accessories.add(glassesGroup);

      // White faceted ruff collar
      const collarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8, flatShading: true });
      const ruffGroup = new THREE.Group();
      ruffGroup.position.set(0, 0.32, 0.45);
      for (let i = 0; i < 7; i++) {
        const petal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), collarMat);
        const a = (i / 6 - 0.5) * Math.PI * 0.8;
        petal.position.set(Math.sin(a) * 0.52, 0, Math.cos(a) * 0.28);
        ruffGroup.add(petal);
      }
      hole.accessories.add(ruffGroup);

    } else if (type === 'golden') {
      hole.scoreValue = 300;
      moleMat.color.setHex(0xf59e0b);
      moleMat.metalness = 0.75;
      moleMat.roughness = 0.25;

      // Small gold halo / crown
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, metalness: 0.85, roughness: 0.15, flatShading: true });
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.18, 6), crownMat);
      crown.position.set(0, 1.35, 0.1);
      crown.rotation.x = -0.2;
      hole.accessories.add(crown);

    } else if (type === 'hardhat') {
      hole.scoreValue = 250;
      hole.hitsRequired = 2;
      // Construction yellow hardhat
      const hatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.1, flatShading: true });
      const hatGeo = new THREE.SphereGeometry(0.68, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const hat = new THREE.Mesh(hatGeo, hatMat);
      hat.position.set(0, 1.05, 0.1);
      hat.scale.set(1.05, 0.8, 1.15);
      hole.accessories.add(hat);

      // Hat brim
      const brimGeo = new THREE.CylinderGeometry(0.74, 0.74, 0.08, 10);
      const brim = new THREE.Mesh(brimGeo, hatMat);
      brim.position.set(0, 1.02, 0.18);
      hole.accessories.add(brim);

    } else {
      // Standard Mole (100 pts)
      hole.scoreValue = 100;
      hole.hitsRequired = 1;
    }
  }

  /**
   * Spawns a mole in a specific hole with duration & type
   */
  public spawnMole(holeIndex: number, type: MoleType = 'standard', duration: number = 1.3) {
    if (holeIndex < 0 || holeIndex >= this.holes.length) return;
    const hole = this.holes[holeIndex];
    if (hole.state !== 'hidden') return;

    this.configureMoleAccessories(holeIndex, type);
    hole.state = 'emerging';
    hole.animProgress = 0;
    hole.lifetime = duration;
    hole.maxLifetime = duration;
    hole.hitsReceived = 0;
    hole.starsGroup.visible = false;
    hole.moleGroup.scale.set(1, 1, 1);
    hole.moleGroup.rotation.set(0, 0, 0);

    sound.playPop();
  }

  /**
   * Strikes a hole at given coordinates with the hammer
   */
  public performHammerStrike(targetWorldPos: THREE.Vector3, onImpact?: () => void) {
    this.isSwinging = true;
    this.swingProgress = 0;
    this.swingStartPos.copy(this.hammerGroup.position);
    this.hammerTargetPos.copy(targetWorldPos);
    this.hammerTargetPos.y = Math.max(targetWorldPos.y, 0.7);

    // Impact timing precisely synced with peak downward momentum at progress ~0.36
    setTimeout(() => {
      onImpact?.();
    }, 100);
  }

  /**
   * Spawns bursting impact stars and dust cubes in 3D
   */
  private spawnImpactParticles(pos: THREE.Vector3, isHit: boolean = true) {
    const count = isHit ? 14 : 7;
    const starColor = isHit ? 0xfef08a : 0xe2e8f0;
    const mat = new THREE.MeshStandardMaterial({
      color: starColor,
      roughness: 0.4,
      metalness: 0.2,
      flatShading: true,
    });

    for (let i = 0; i < count; i++) {
      const geo = isHit && i % 2 === 0
        ? new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.08, 0)
        : new THREE.BoxGeometry(0.14, 0.14, 0.14);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.6,
        pos.y + 0.5 + Math.random() * 0.4,
        pos.z + (Math.random() - 0.5) * 0.6
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 4.5;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed * 0.5,
        4.0 + Math.random() * 3.5,
        Math.sin(angle) * speed * 0.5
      );

      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        rotSpeed,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.25,
      });
    }
  }

  /**
   * Projects a 3D world position to 2D viewport coordinates for floating text HUD
   */
  private projectToScreen(pos: THREE.Vector3): { x: number; y: number } {
    const v = pos.clone();
    v.project(this.camera);
    const rect = this.container.getBoundingClientRect();
    const x = ((v.x + 1) * rect.width) / 2 + rect.left;
    const y = ((-v.y + 1) * rect.height) / 2 + rect.top;
    return { x, y };
  }

  /**
   * Handles user click / touch tap on the 3D scene
   */
  public handlePointerTap(clientX: number, clientY: number) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Check if any mole was clicked
    let hitMoleHole: (typeof this.holes)[0] | null = null;
    let hitHoleIndex = -1;

    // Test moles
    for (let i = 0; i < this.holes.length; i++) {
      const hole = this.holes[i];
      if (hole.state === 'emerging' || hole.state === 'idle') {
        const intersects = this.raycaster.intersectObjects(hole.moleGroup.children, true);
        if (intersects.length > 0) {
          hitMoleHole = hole;
          hitHoleIndex = i;
          break;
        }
      }
    }

    // 2. If no mole directly hit, check if the hole rim or inner hole was tapped
    if (!hitMoleHole) {
      for (let i = 0; i < this.holes.length; i++) {
        const hole = this.holes[i];
        const intersects = this.raycaster.intersectObjects([hole.rimMesh, hole.innerMesh], true);
        if (intersects.length > 0) {
          hitHoleIndex = i;
          // If mole is currently up in this hole, register hit
          if (hole.state === 'emerging' || hole.state === 'idle') {
            hitMoleHole = hole;
          }
          break;
        }
      }
    }

    // 3. Determine strike position
    let strikePos = new THREE.Vector3();
    if (hitHoleIndex >= 0) {
      strikePos.copy(this.holes[hitHoleIndex].position);
      strikePos.y += 0.8;
    } else {
      // Intersect with ground
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.raycaster.ray.intersectPlane(groundPlane, strikePos);
      if (strikePos.length() > 20) {
        strikePos.copy(this.defaultHammerIdlePos);
      }
    }

    // 4. Perform hammer animation and resolve logic
    this.performHammerStrike(strikePos, () => {
      if (hitMoleHole) {
        // Mole Hit!
        hitMoleHole.hitsReceived += 1;
        this.spawnImpactParticles(strikePos, true);
        this.shakeIntensity = 0.25;

        if (hitMoleHole.moleType === 'hardhat' && hitMoleHole.hitsReceived < hitMoleHole.hitsRequired) {
          // Hardhat flew off!
          sound.playHit('miner', 1);
          // remove hardhat accessory
          while (hitMoleHole.accessories.children.length > 0) {
            hitMoleHole.accessories.remove(hitMoleHole.accessories.children[0]);
          }
          const screenPos = this.projectToScreen(strikePos);
          this.callbacks.onScreenCoords(screenPos.x, screenPos.y, '1 MORE HIT!', '#facc15');
          return;
        }

        // Full KO!
        hitMoleHole.state = 'hit';
        hitMoleHole.animProgress = 0;
        hitMoleHole.starsGroup.visible = true;

        const moleInfo: MoleInfo = {
          holeIndex: hitHoleIndex,
          type: hitMoleHole.moleType,
          state: 'hit',
          progress: 1,
          lifetime: 0,
          maxLifetime: hitMoleHole.maxLifetime,
          hitsRequired: hitMoleHole.hitsRequired,
          hitsReceived: hitMoleHole.hitsReceived,
          scoreValue: hitMoleHole.scoreValue,
        };

        const screenPos = this.projectToScreen(strikePos);
        this.callbacks.onMoleHit(moleInfo, screenPos.x, screenPos.y);

      } else {
        // Miss!
        this.spawnImpactParticles(strikePos, false);
        sound.playMiss();
        this.callbacks.onMiss();
      }
    });
  }

  /**
   * Tracks cursor for subtle parallax while keeping hammer in upper-left
   */
  public handlePointerMove(clientX: number, clientY: number) {
    if (this.isSwinging) return;
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    // Subtle responsive tilt/bob towards cursor while maintaining upper-left perch
    const offsetX = this.mouse.x * 0.35;
    const offsetZ = -this.mouse.y * 0.35;
    this.hammerTargetPos.set(
      this.defaultHammerIdlePos.x + offsetX,
      this.defaultHammerIdlePos.y,
      this.defaultHammerIdlePos.z + offsetZ
    );
  }

  private boundPointerDown: ((e: PointerEvent) => void) | null = null;
  private boundPointerMove: ((e: PointerEvent) => void) | null = null;

  private setupEventListeners() {
    const dom = this.container;

    // Mobile touch & desktop click unified
    this.boundPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      this.handlePointerTap(e.clientX, e.clientY);
    };

    this.boundPointerMove = (e: PointerEvent) => {
      // On touch drag or mouse move
      if (e.pointerType === 'mouse') {
        this.handlePointerMove(e.clientX, e.clientY);
      }
    };

    dom.addEventListener('pointerdown', this.boundPointerDown, { passive: false });
    dom.addEventListener('pointermove', this.boundPointerMove, { passive: true });

    // Window resize
    window.addEventListener('resize', this.onResize);
  }

  private updateCameraForViewport(width: number, height: number) {
    const aspect = width / height;
    this.camera.aspect = aspect;

    // Responsive camera zoom adjustment for portrait phones vs desktop
    if (aspect < 1) {
      // Mobile portrait mode: pull back camera so all 9 holes fit completely
      const zoomFactor = Math.max(0.68, aspect);
      this.baseCameraPos.set(0, 16.5 / zoomFactor, 15.5 / zoomFactor);
      this.camera.position.copy(this.baseCameraPos);
      this.camera.lookAt(0, 0.4, 0.3);
    } else {
      // Desktop / Landscape
      this.baseCameraPos.set(0, 14, 13);
      this.camera.position.copy(this.baseCameraPos);
      this.camera.lookAt(0, -0.4, 0.2);
    }
    this.camera.updateProjectionMatrix();
  }

  public onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.updateCameraForViewport(width, height);
  };

  /**
   * Main animation loop
   */
  private renderLoop = () => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.renderLoop);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // 1. Update Holes & Moles
    this.updateMoles(dt);

    // 2. Update Hammer
    this.updateHammer(dt);

    // 3. Update Particles
    this.updateParticles(dt);

    // 4. Update Screen Shake
    if (this.shakeIntensity > 0) {
      this.camera.position.x = this.baseCameraPos.x + (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y = this.baseCameraPos.y + (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.2);
    } else {
      this.camera.position.copy(this.baseCameraPos);
    }

    // 5. Render Scene
    this.renderer.render(this.scene, this.camera);
  };

  private updateMoles(dt: number) {
    this.holes.forEach((hole) => {
      if (hole.state === 'emerging') {
        // Emerging from Y = -1.1 to Y = 0.0
        hole.animProgress += dt / 0.16; // 0.16s emergence
        if (hole.animProgress >= 1) {
          hole.animProgress = 1;
          hole.state = 'idle';
          hole.moleGroup.position.y = 0;
        } else {
          // Bounce ease-out
          const t = hole.animProgress;
          const ease = Math.sin((t * Math.PI) / 2);
          hole.moleGroup.position.y = -1.1 * (1 - ease);
        }

      } else if (hole.state === 'idle') {
        hole.lifetime -= dt;
        // Subtle breathing bounce
        const breath = Math.sin(performance.now() * 0.008) * 0.04;
        hole.moleGroup.position.y = breath;

        if (hole.lifetime <= 0) {
          hole.state = 'submerging';
          hole.animProgress = 0;
        }

      } else if (hole.state === 'submerging') {
        hole.animProgress += dt / 0.2; // 0.2s submerge
        if (hole.animProgress >= 1) {
          hole.animProgress = 1;
          hole.state = 'hidden';
          hole.moleGroup.position.y = -1.1;
          hole.starsGroup.visible = false;
        } else {
          const t = hole.animProgress;
          hole.moleGroup.position.y = -1.1 * t;
        }

      } else if (hole.state === 'hit') {
        // Dizzy / Squish animation
        hole.animProgress += dt / 0.35;
        // Spin dizzy stars
        hole.starsGroup.rotation.y += dt * 8;

        if (hole.animProgress < 0.3) {
          // Flatten / squish
          const t = hole.animProgress / 0.3;
          hole.moleGroup.scale.set(1.2, 0.65, 1.2);
          hole.moleGroup.rotation.z = Math.sin(t * Math.PI) * 0.25;
        } else if (hole.animProgress < 1) {
          // Sink down fast
          const sinkT = (hole.animProgress - 0.3) / 0.7;
          hole.moleGroup.position.y = -1.1 * sinkT;
          hole.moleGroup.scale.set(1, 1, 1);
        } else {
          hole.state = 'hidden';
          hole.starsGroup.visible = false;
          hole.moleGroup.position.y = -1.1;
          hole.moleGroup.scale.set(1, 1, 1);
          hole.moleGroup.rotation.set(0, 0, 0);
        }
      }
    });
  }

  private updateHammer(dt: number) {
    if (this.isSwinging) {
      this.swingProgress += dt / 0.28; // 0.28s punchy natural swing cycle

      if (this.swingProgress < 0.36) {
        // Phase 1: High Arc & Acceleration Slam (0 to 0.36)
        const t = this.swingProgress / 0.36;

        // Horizontal smoothstep lerp from start to target
        const horizEase = t * t * (3 - 2 * t);
        this.hammerCurrentPos.x = THREE.MathUtils.lerp(this.swingStartPos.x, this.hammerTargetPos.x, horizEase);
        this.hammerCurrentPos.z = THREE.MathUtils.lerp(this.swingStartPos.z, this.hammerTargetPos.z, horizEase);

        // Vertical arc: lifts up with anticipation wind-up, then plunges rapidly!
        const arcLift = Math.sin(t * Math.PI) * 1.5;
        const downSlam = Math.pow(t, 2.5); // accelerating downward plunge
        this.hammerCurrentPos.y = THREE.MathUtils.lerp(this.swingStartPos.y, this.hammerTargetPos.y, downSlam) + arcLift * (1 - t * 0.7);
        this.hammerGroup.position.copy(this.hammerCurrentPos);

        // Rotation kinematics:
        // Anticipation (first 25%): head draws back slightly
        // Downward smash (25% to 100%): head rotates forward and slams downward into hole
        const rotWindup = Math.sin(t * Math.PI * 0.5) * -0.18;
        const rotSlam = Math.pow(Math.max(0, (t - 0.2) / 0.8), 2.2) * 1.35;
        const dynamicTilt = rotWindup + rotSlam;

        this.hammerPivot.rotation.set(
          this.baseHammerRot.x + dynamicTilt * 0.75,
          this.baseHammerRot.y - dynamicTilt * 0.35,
          this.baseHammerRot.z + dynamicTilt * 0.25 + this.hammerHeadAngle
        );

      } else if (this.swingProgress < 1.0) {
        // Phase 2: Impact Rebound & Smooth Ease-Out Return (0.36 to 1.0)
        const t = (this.swingProgress - 0.36) / 0.64;

        // Rebound bounce upon smashing the target
        const rebound = t < 0.22 ? Math.sin((t / 0.22) * Math.PI) * 0.38 : 0;
        const returnEase = 1 - Math.pow(1 - t, 3); // cubic ease-out

        this.hammerCurrentPos.x = THREE.MathUtils.lerp(this.hammerTargetPos.x, this.defaultHammerIdlePos.x, returnEase);
        this.hammerCurrentPos.z = THREE.MathUtils.lerp(this.hammerTargetPos.z, this.defaultHammerIdlePos.z, returnEase);
        this.hammerCurrentPos.y = THREE.MathUtils.lerp(this.hammerTargetPos.y, this.defaultHammerIdlePos.y, returnEase) + rebound;
        this.hammerGroup.position.copy(this.hammerCurrentPos);

        // Rotation smoothly settles back to idle pose
        const startStrikeRotX = this.baseHammerRot.x + 1.35 * 0.75;
        const startStrikeRotY = this.baseHammerRot.y - 1.35 * 0.35;
        const startStrikeRotZ = this.baseHammerRot.z + 1.35 * 0.25 + this.hammerHeadAngle;

        this.hammerPivot.rotation.set(
          THREE.MathUtils.lerp(startStrikeRotX, this.baseHammerRot.x, returnEase),
          THREE.MathUtils.lerp(startStrikeRotY, this.baseHammerRot.y, returnEase),
          THREE.MathUtils.lerp(startStrikeRotZ, this.baseHammerRot.z + this.hammerHeadAngle, returnEase)
        );

      } else {
        // Swing complete, return to idle
        this.isSwinging = false;
        this.swingProgress = 0;
        this.hammerTargetPos.copy(this.defaultHammerIdlePos);
        this.applyHammerOrientation();
      }

    } else {
      // Idle state: smooth breathing & organic hovering
      this.hammerCurrentPos.lerp(this.hammerTargetPos, dt * 7);
      const now = performance.now() * 0.0025;
      const bob = Math.sin(now) * 0.08;
      const sway = Math.cos(now * 0.7) * 0.03;

      this.hammerGroup.position.set(
        this.hammerCurrentPos.x + sway,
        this.hammerCurrentPos.y + bob,
        this.hammerCurrentPos.z
      );

      // Maintain the exact angle from Image 2 in idle with gentle breathing:
      const breathRot = Math.sin(now) * 0.02;
      this.hammerPivot.rotation.set(
        this.baseHammerRot.x + breathRot,
        this.baseHammerRot.y,
        this.baseHammerRot.z + this.hammerHeadAngle + breathRot * 0.5
      );
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.velocity.y -= 18.0 * dt; // gravity
      p.mesh.position.addScaledVector(p.velocity, dt);

      p.mesh.rotation.x += p.rotSpeed.x * dt;
      p.mesh.rotation.y += p.rotSpeed.y * dt;
      p.mesh.rotation.z += p.rotSpeed.z * dt;

      // Scale fade
      const scale = (1 - p.life / p.maxLife);
      p.mesh.scale.set(scale, scale, scale);
    }
  }

  public getAvailableHoleIndices(): number[] {
    const indices: number[] = [];
    this.holes.forEach((h, i) => {
      if (h.state === 'hidden') indices.push(i);
    });
    return indices;
  }

  public resetAllMoles() {
    this.holes.forEach((h) => {
      h.state = 'hidden';
      h.animProgress = 0;
      h.moleGroup.position.y = -1.1;
      h.starsGroup.visible = false;
      h.moleGroup.scale.set(1, 1, 1);
      h.moleGroup.rotation.set(0, 0, 0);
    });
  }

  public destroy() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    if (this.container) {
      if (this.boundPointerDown) {
        this.container.removeEventListener('pointerdown', this.boundPointerDown);
      }
      if (this.boundPointerMove) {
        this.container.removeEventListener('pointermove', this.boundPointerMove);
      }
      if (this.renderer && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
