import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import grassImg from "./grass.jpg";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import nipplejs from "nipplejs";
const CAMERA_OFFSET = new THREE.Vector3(0, 5, -10); // 攝影機相對角色的偏移
const OBSTACLE_SIZE = 2; // 障礙物尺寸
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

let joystickLeftInput = new THREE.Vector2(); // 儲存左搖桿的輸入
let joystickRightInput = 0; // 儲存右搖桿的水平旋轉輸入

// 判斷是否支援觸控
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
console.log(`Touch supported: ${isTouchDevice}`);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let character: THREE.Mesh<THREE.BoxGeometry, THREE.Material[]>;
let clock: THREE.Clock;
let keys: Record<string, boolean> = {};
let obstacles: THREE.Mesh<THREE.BoxGeometry, THREE.Material>[] = [];
let controls: PointerLockControls;
let interactableObject: THREE.Mesh<THREE.BoxGeometry, THREE.Material> | null =
  null; // 可互動物件
let interactionRange = 2; // 設定和物體互動的最大距離
let interactingObject: THREE.Mesh<THREE.BoxGeometry, THREE.Material> | null =
  null; // 用來記錄目前交互的物體

// 攝影機旋轉角度
let rotationAngleX = 0; // 水平旋轉角度

const messageElement = document.querySelector("#message") as HTMLDivElement;

function init() {
  initializeScene();
  initializeRenderer();
  initializeCamera();
  initializeControls();
  initializeGround();
  initializeCharacter();
  initializeObstacles();
  initializeInteraction();
  initializeEventListeners();
  initializeFbx();
  clock = new THREE.Clock();

  animate();
}

function initializeFbx() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 環境光
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 10, 10);
  directionalLight.castShadow = true; // 如果需要陰影
  scene.add(directionalLight);

  const loader = new FBXLoader();
  loader.load(
    "/test3.fbx", // 替換為您的模型路徑
    (fbx) => {
      // 設置模型大小和位置
      fbx.scale.set(0.5, 0.5, 0.5); // 調整縮放（視模型而定）
      fbx.position.set(0, 0, 0); // 起始位置
      fbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          // 啟用模型的陰影
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // 將模型添加到場景
      scene.add(fbx);
    },
    (xhr) => {
      // 加載進度
      console.log(`FBX 加載進度: ${(xhr.loaded / xhr.total) * 100}%`);
    },
    (error) => {
      // 錯誤處理
      console.error("加載 FBX 時發生錯誤", error);
    }
  );
}
function initializeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x918ecc);
}

function initializeRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

function initializeCamera() {
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
}

function initializeControls() {
  if (!isTouchDevice) {
    controls = new PointerLockControls(camera, document.body);
    document.addEventListener("click", () => controls.lock());
    controls.addEventListener("lock", () => console.log("Pointer locked"));
    controls.addEventListener("unlock", () => console.log("Pointer unlocked"));
  }
}

function initializeGround() {
  const textureLoader = new THREE.TextureLoader();
  const grassTexture = textureLoader.load(grassImg);
  grassTexture.wrapS = THREE.RepeatWrapping;
  grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(2, 2);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshBasicMaterial({ map: grassTexture })
  );
  ground.rotation.x = -Math.PI / 2;
  // scene.add(ground);
}

function initializeCharacter() {
  const characterGeometry = new THREE.BoxGeometry(1, 2, 1);
  const characterMaterials = [
    new THREE.MeshBasicMaterial({ color: 0x00ffff }),
    new THREE.MeshBasicMaterial({ color: 0x00ffff }),
    new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    new THREE.MeshBasicMaterial({ color: 0x0000ff }),
  ];

  character = new THREE.Mesh(characterGeometry, characterMaterials);
  character.position.y = 1;
  scene.add(character);
}

function initializeInteraction() {
  // 創建一個可互動物件
  const interactableGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const interactableMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

  interactableObject = new THREE.Mesh(
    interactableGeometry,
    interactableMaterial
  );

  // 設定可互動物件的位置
  interactableObject.position.set(0, 1, 5); // 在固定位置放置物體（例如 Z 軸位置為 5）

  // scene.add(interactableObject);
}

function initializeObstacles() {
  const obstacleGeometry = new THREE.BoxGeometry(
    OBSTACLE_SIZE,
    OBSTACLE_SIZE,
    OBSTACLE_SIZE
  );
  const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });

  const obstacle1 = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle1.position.set(5, OBSTACLE_SIZE / 2, 5);
  // obstacles.push(obstacle1);
  // scene.add(obstacle1);

  const obstacle2 = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle2.position.set(-5, OBSTACLE_SIZE / 2, 5);
  // obstacles.push(obstacle2);
  // scene.add(obstacle2);

  const obstacle3 = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle3.position.set(7.25, OBSTACLE_SIZE / 2, 7.25);
  // obstacles.push(obstacle3);
  // scene.add(obstacle3);

  const obstacle4 = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle4.position.set(-7, OBSTACLE_SIZE / 2, 7);
  // obstacles.push(obstacle4);
  // scene.add(obstacle4);
}

function initializeEventListeners() {
  window.addEventListener("resize", onWindowResize);
  if (isTouchDevice) {
    // 初始化搖桿
    const joystickLeft = nipplejs.create({
      zone: document.getElementById("joystick-left") as HTMLDivElement,
      mode: "dynamic",
    });

    const joystickRight = nipplejs.create({
      zone: document.getElementById("joystick-right") as HTMLDivElement,
      mode: "dynamic",
    });

    // 更新左搖桿輸入
    joystickLeft.on("move", (_e, data) => {
      // 重置所有鍵為 false，避免多方向同時觸發
      keys["w"] = false;
      keys["a"] = false;
      keys["s"] = false;
      keys["d"] = false;

      // 判斷搖桿方向
      if (data.direction && data.direction.angle) {
        switch (data.direction.angle) {
          case "up":
            keys["w"] = true; // 模擬按下 W
            break;
          case "down":
            keys["s"] = true; // 模擬按下 S
            break;
          case "left":
            keys["a"] = true; // 模擬按下 A
            break;
          case "right":
            keys["d"] = true; // 模擬按下 D
            break;
        }
      }
    });

    joystickLeft.on("end", () => {
      // 搖桿停止時，重置所有鍵
      keys["w"] = false;
      keys["a"] = false;
      keys["s"] = false;
      keys["d"] = false;
    });

    // 更新右搖桿輸入
    joystickRight.on("move", (_e, data) => {
      if (data.vector) {
        joystickRightInput = data.vector.x; // 右搖桿只關注 X 軸輸入
      }
    });

    joystickRight.on("end", () => {
      joystickRightInput = 0; // 停止時重設輸入
    });
  } else {
    // 使用鍵盤/滑鼠的事件監聽器
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      onKeyDown(e);
    });
    window.addEventListener("keyup", (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    });
    document.addEventListener("mousemove", onMouseMove);
  }
}
function onKeyDown(event: KeyboardEvent) {
  if (event.key.toLowerCase() === "f" && interactingObject) {
    // 當按下 F 且和可互動物體靠近時顯示提示
    // console.log("You are interacting with the object!");
    Toastify({
      text: "與物件互動成功",
      // style: {
      //   background: "linear-gradient(to right, #cccccc, #999999)",
      // },
    }).showToast();
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event: MouseEvent) {
  if (!controls.isLocked) return;

  // 水平旋轉 (左右)
  rotationAngleX -= event.movementX * 0.002;
}
function checkCollision(position: THREE.Vector3) {
  const COLLISION_BUFFER = 0;
  for (const obstacle of obstacles) {
    const distance = obstacle.position.distanceTo(position);
    const combinedSize = OBSTACLE_SIZE / 2 + 0.5 + COLLISION_BUFFER; // 障礙物半徑 + 角色半徑
    if (distance < combinedSize) {
      return true; // 發生碰撞
    }
  }
  return false;
}

function checkInteraction() {
  if (!interactableObject) return;

  const distance = character.position.distanceTo(interactableObject.position);

  // 檢查角色是否靠近可互動物體
  if (distance < interactionRange) {
    // 當角色靠近物體時，準備觸發互動
    interactingObject = interactableObject;

    messageElement.classList.add("visible");
  } else {
    interactingObject = null; // 如果距離太遠，則不觸發互動
    messageElement.classList.remove("visible");
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const speed = 5;

  // 計算鍵盤輸入的移動方向
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraDirection.y = 0;
  cameraDirection.normalize();

  const rightDirection = new THREE.Vector3(
    -cameraDirection.z,
    0,
    cameraDirection.x
  );

  const moveVector = new THREE.Vector3();
  if (keys["w"]) moveVector.add(cameraDirection);
  if (keys["s"]) moveVector.sub(cameraDirection);
  if (keys["a"]) moveVector.sub(rightDirection);
  if (keys["d"]) moveVector.add(rightDirection);

  // 計算左搖桿輸入的移動方向
  const joystickMoveVector = new THREE.Vector3()
    .add(cameraDirection.clone().multiplyScalar(joystickLeftInput.y))
    .add(rightDirection.clone().multiplyScalar(joystickLeftInput.x));

  // 合併鍵盤和搖桿的移動方向
  moveVector
    .add(joystickMoveVector)
    .normalize()
    .multiplyScalar(speed * delta);

  // 檢查是否碰撞
  const potentialPosition = character.position.clone().add(moveVector);
  if (!checkCollision(potentialPosition)) {
    character.position.add(moveVector);
  }

  // 更新角色朝向
  if (moveVector.length() > 0) {
    character.lookAt(character.position.clone().add(moveVector));
  }

  // 更新攝影機旋轉角度
  rotationAngleX -= joystickRightInput * delta * 2; // 搖桿控制攝影機旋轉速度
  updateCamera();

  // 檢查互動
  checkInteraction();

  // 渲染場景
  renderer.render(scene, camera);
}

function updateCamera() {
  // 水平旋轉：繞角色進行旋轉
  const cameraOffsetRotated = CAMERA_OFFSET.clone().applyAxisAngle(
    new THREE.Vector3(0, 1, 0), // 水平旋轉
    rotationAngleX
  );

  // 計算相機的最終位置和視角
  camera.position.copy(character.position.clone().add(cameraOffsetRotated));

  camera.lookAt(
    character.position.clone().add(new THREE.Vector3(0, 1, 0)) // 確保相機看向角色
  );
}

init();
