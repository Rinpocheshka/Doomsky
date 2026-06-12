// Multi-level Generation and Loot Spawning

const TILE_SIZE = 4;
let walls = [];
let exitPortal = null;
let portalLight = null;
let floorMesh = null;
let ceilingMesh = null;

const wallGeometry = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE);
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
const pillarGeometry = new THREE.CylinderGeometry(1.5, 1.5, TILE_SIZE, 16);
const crateGeometry = new THREE.BoxGeometry(2.5, 2.5, 2.5);

const spriteMaterials = {};

// ──── TILE LEGEND ────
// 0:Empty  1:Wall  2:Enemy  3:Medkit  4:Armor  5:Ammo  6:Shotgun
// 7:Light(red/torch)  8:Light(blue)  9:Exit  10:Rifle  11:Plasma
// 12:PlayerStart  13:FakeWall  14:Pillar  15:Crate  16:Barrel(decor)

// ──── LEVEL 1 — "The Bunker" ────
// Tutorial-friendly: clear layout, guided corridors, shotgun reward, forgiving loot.
// 7 basic enemies, 2 medkits, 1 armor, 2 ammo, 1 shotgun pickup.
// Player starts in a safe spawn room. Exit is guarded by 2 enemies.
const level1 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,7,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,0,12,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 12=spawn
    [1,1,1,0,0,0,0,0,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,0,0,3,0,0,1,1,0,7,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,0,0,0,1,1,1,0,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,0,0,0,1,1,1,0,2,0,0,1,1,1,1,0,2,0,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,0,0,5,0,0,1,1,1,1,0,0,7,0,0,2,0,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,14,0,0,2,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,0,0,6,0,0,1,1,1,0,4,0,0,0,2,0,0,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,14,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,0,2,0,0,0,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,5,0,0,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,2,0,0,2,0,0,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,3,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,9,1,1,1,1,1,1], // exit guarded
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ──── LEVEL 2 — "The Facility" ────
// Medium difficulty: maze-like with rooms, blue lighting, mix of enemies.
// 11 enemies (mix), 2 medkits, 2 armor, 3 ammo, rifle pickup.
// Requires finding the rifle to comfortably clear the exit room (4 enemies).
const level2 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,12,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,8,0,0,8,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,1,0,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,0,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,1,1,0,8,0,0,8,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,2,0,3,0,1,1,1,0,0,2,0,0,2,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,0,1,1,1,0,14,1,14,0,1,1,0,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,2,0,1,1,1,1,1,1,1],
    [1,0,4,0,2,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,0,2,0,0,1,1,1,1],
    [1,1,0,1,1,1,0,1,14,1,0,1,1,0,1,1,1,0,1,1,1,1,0,0,0,0,0,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,2,0,0,1,1,1],
    [1,0,8,0,0,0,1,0,2,0,0,2,0,0,1,0,2,0,0,2,0,0,1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,4,0,0,0,0,0,0,3,0,0,0,1],
    [1,1,0,1,1,1,0,1,14,1,0,1,1,0,1,1,1,0,1,1,1,1,0,1,1,1,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,2,0,0,0,1,0,0,2,0,0,2,0,1,0,0,2,0,0,2,0,1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,8,0,0,1,0,0,0,8,0,0,0,1,0,0,10,0,0,0,1],
    [1,1,0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0,1,1,1,1,1],
    [1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,8,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,2,0,0,0,0,2,0,0,0,2,0,0,2,0,0,0,2,0,0,2,0,0,2,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ──── LEVEL 3 — "Hell Gate" ────
// Hard: large central arena + interconnected rooms, all enemy types, plasma reward.
// 16 enemies (all types mixed), loot concentrated around danger zones.
// Exit is in a sealed room behind a fake wall (secret!).
const level3 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,12,0,0,0,1,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,0,0,0,7,1],
    [1,0,7,0,0,1,0,2,0,0,1,1,1,1,1,1,1,1,1,0,2,0,0,1,0,7,0,2,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,2,0,0,0,0,0,0,0,0,14,0,0,14,0,14,0,0,14,0,0,0,0,0,0,0,2,0,1],
    [1,0,0,0,0,7,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,7,0,0,0,0,0,1],
    [1,1,0,1,1,0,1,15,15,0,0,0,2,0,0,7,0,0,2,0,15,15,0,0,1,0,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,4,0,0,0,1,0,0,0,0,0,0,0,7,0,7,0,0,0,0,0,0,0,1,0,0,4,0,1],
    [1,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,1],
    [1,1,0,1,1,0,1,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,1,0,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,1,0,0,0,0,1],
    [1,0,7,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,7,0,0,1],
    [1,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,1],
    [1,1,0,1,1,0,1,0,0,0,0,2,0,0,0,7,0,0,0,2,0,0,0,0,1,0,1,0,0,1],
    [1,0,0,0,0,0,1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,2,0,0,1,0,0,0,0,1],
    [1,0,3,0,0,7,1,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,1,7,3,0,0,1],
    [1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,7,0,0,0,0,2,0,15,15,0,0,2,0,0,2,0,0,15,15,0,2,0,0,0,7,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,5,0,0,0,5,0,0,5,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,13,1,1], // 13=fake wall secret
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,1], // plasma behind fake wall
    [1,0,2,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,1],
    [1,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,3,1],
    [1,0,2,0,0,0,0,0,2,0,0,0,0,2,0,0,2,0,0,0,0,0,2,0,0,0,0,0,4,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ──── LEVEL 4 — "Логово Босса" ────
// Final showdown: obsidian arena with hellfire torches, all enemy types, and the Boss.
// Player starts in a corridor and must push through the arena to fight the Boss.
// Exit is behind the Boss — you must kill it to advance.
const level4 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,7,9,7,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // exit flanked by torches
    [1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,4,0,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // armor before boss
    [1,1,1,1,1,1,1,1,1,1,1,1,1,0,17,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // BOSS
    [1,1,1,1,1,1,1,1,7,0,0,0,0,0,0,0,0,0,0,7,1,1,1,1,1,1,1,1,1,1], // arena top: torches
    [1,1,1,1,1,1,1,1,1,0,14,0,0,0,2,0,0,0,14,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,0,0,2,0,0,0,2,0,0,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,2,0,0,0,0,0,0,2,0,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,3,0,0,2,0,2,0,0,4,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,0,0,14,0,2,0,14,0,0,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,0,5,0,0,0,0,0,0,0,5,0,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,7,0,0,0,0,0,0,0,0,0,0,7,1,1,1,1,1,1,1,1,1,1], // arena bottom: torches
    [1,1,1,1,1,1,1,1,1,1,1,1,0,3,0,3,0,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,0,0,5,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,0,0,12,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1], // player spawn
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const levels = [level1, level2, level3, level4];

function loadSpriteMaterial(name, path) {
    loadTransparentTexture(path, (texture) => {
        spriteMaterials[name] = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true });
    });
}

let floorMat = null;
let ceilMat = null;

function loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('assets/wall.png', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        wallMaterial.map = texture;
        wallMaterial.needsUpdate = true;
    });
    
    textureLoader.load('assets/floor.png', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        floorMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
    });

    textureLoader.load('assets/ceiling.png', (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        ceilMat = new THREE.MeshStandardMaterial({ map: texture });
    });
    
    loadSpriteMaterial('medkit', 'assets/medkit.png');
    loadSpriteMaterial('armor', 'assets/armor.png');
    loadSpriteMaterial('ammo', 'assets/ammo.png');
    loadSpriteMaterial('shotgun', 'assets/shotgun_pickup.png');
    loadSpriteMaterial('rifle', 'assets/rifle_pickup.png');
    loadSpriteMaterial('plasma', 'assets/plasma_pickup.png');
}
loadTextures();

function clearLevel() {
    walls.forEach(w => scene.remove(w));
    walls = [];
    if (typeof getEnemies === 'function') {
        const enems = getEnemies();
        enems.forEach(e => {
            scene.remove(e);
            if(e.userData.ui) e.userData.ui.remove();
        });
        enems.length = 0; 
    }
    items.forEach(i => scene.remove(i));
    items.length = 0;
    
    levelLights.forEach(l => scene.remove(l));
    levelLights.length = 0;
    
    if (exitPortal) { scene.remove(exitPortal); exitPortal = null; }
    if (portalLight) { scene.remove(portalLight); portalLight = null; }
}

function loadLevel(index) {
    if (index >= levels.length) {
        gameState = 'FINAL_VICTORY';
        document.exitPointerLock();
        const el = document.getElementById('final-victory');
        el.style.display = 'flex';
        document.getElementById('final-stats').innerHTML = 
            `Убито врагов: ${totalKills}<br>Очки: ${score}`;
        return;
    }
    
    clearLevel();
    const map = levels[index];
    
    // Level-specific wall colors and atmosphere
    if (index === 0) {
        wallMaterial.color.setHex(0x667766); // Greenish-grey bunker
        scene.fog = new THREE.FogExp2(0x050a05, 0.03);
        scene.background = new THREE.Color(0x050a05);
    } else if (index === 1) {
        wallMaterial.color.setHex(0x335577); // Blue tech facility
        scene.fog = new THREE.FogExp2(0x000510, 0.028);
        scene.background = new THREE.Color(0x000510);
    } else if (index === 2) {
        wallMaterial.color.setHex(0xaa3322); // Red hell gate
        scene.fog = new THREE.FogExp2(0x100000, 0.032);
        scene.background = new THREE.Color(0x100000);
    } else if (index === 3) {
        wallMaterial.color.setHex(0x220011); // Dark crimson obsidian
        scene.fog = new THREE.FogExp2(0x1a0022, 0.032); // Purple-red hell fog
        scene.background = new THREE.Color(0x1a0022);
    }
    
    if (!floorMesh) {
        const floorGeo = new THREE.PlaneGeometry(400, 400);
        const mat = floorMat ? floorMat : new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
        floorMesh = new THREE.Mesh(floorGeo, mat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        scene.add(floorMesh);
        
        const ceilGeo = new THREE.PlaneGeometry(400, 400);
        const cMat = ceilMat ? ceilMat : new THREE.MeshStandardMaterial({ color: 0x050505 });
        ceilingMesh = new THREE.Mesh(ceilGeo, cMat);
        ceilingMesh.rotation.x = Math.PI / 2;
        ceilingMesh.position.y = TILE_SIZE;
        scene.add(ceilingMesh);
    }

    const mapWidth = map[0].length;
    const mapHeight = map.length;
    const offsetX = (mapWidth * TILE_SIZE) / 2;
    const offsetZ = (mapHeight * TILE_SIZE) / 2;

    // Find player spawn first (tile 12), fallback to first open tile
    let spawnX = null, spawnZ = null;
    for (let z = 0; z < mapHeight; z++) {
        for (let x = 0; x < mapWidth; x++) {
            if (map[z][x] === 12) {
                spawnX = x * TILE_SIZE - offsetX;
                spawnZ = z * TILE_SIZE - offsetZ;
            }
        }
    }
    // Fallback: find first open cell that isn't next to a border
    if (spawnX === null) {
        outer: for (let z = 2; z < mapHeight - 2; z++) {
            for (let x = 2; x < mapWidth - 2; x++) {
                if (map[z][x] === 0) {
                    spawnX = x * TILE_SIZE - offsetX;
                    spawnZ = z * TILE_SIZE - offsetZ;
                    break outer;
                }
            }
        }
    }
    controls.getObject().position.set(spawnX, 2, spawnZ);

    setTimeout(() => {
        for (let z = 0; z < mapHeight; z++) {
            for (let x = 0; x < mapWidth; x++) {
                const val = map[z][x];
                const px = x * TILE_SIZE - offsetX;
                const pz = z * TILE_SIZE - offsetZ;
                
                if (val === 1) { 
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(px, TILE_SIZE/2, pz);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    scene.add(wall);
                    walls.push(wall);
                } else if (val === 13) { 
                    // Fake/secret wall — visible but no collision
                    const fakeWall = new THREE.Mesh(wallGeometry, wallMaterial);
                    fakeWall.position.set(px, TILE_SIZE/2, pz);
                    fakeWall.castShadow = true;
                    fakeWall.receiveShadow = true;
                    scene.add(fakeWall);
                } else if (val === 14) { 
                    // Pillar
                    const pillar = new THREE.Mesh(pillarGeometry, wallMaterial);
                    pillar.position.set(px, TILE_SIZE/2, pz);
                    pillar.castShadow = true;
                    pillar.receiveShadow = true;
                    scene.add(pillar);
                    walls.push(pillar);
                } else if (val === 15) { 
                    // Crate — brown, solid
                    const crateMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2b, roughness: 0.9 });
                    const crate = new THREE.Mesh(crateGeometry, crateMat);
                    crate.position.set(px, 1.25, pz);
                    crate.castShadow = true;
                    crate.receiveShadow = true;
                    scene.add(crate);
                    walls.push(crate);
                } else if (val === 2) {
                    // Only spawn enemies if they're not ON the player spawn
                    const distToSpawn = Math.sqrt((px - spawnX)**2 + (pz - spawnZ)**2);
                    if (distToSpawn > TILE_SIZE * 2) {
                        if (typeof spawnEnemy === 'function') spawnEnemy(px, pz);
                    }
                } else if (val === 17) {
                    if (typeof spawnEnemy === 'function') spawnEnemy(px, pz, 3);
                } else if (val === 3) { 
                    spawnItemSprite(px, pz, 'medkit');
                } else if (val === 4) { 
                    spawnItemSprite(px, pz, 'armor');
                } else if (val === 5) { 
                    spawnItemSprite(px, pz, 'ammo');
                } else if (val === 6) { 
                    spawnItemSprite(px, pz, 'shotgun');
                } else if (val === 10) { 
                    spawnItemSprite(px, pz, 'rifle');
                } else if (val === 11) { 
                    spawnItemSprite(px, pz, 'plasma');
                } else if (val === 7) {
                    // Red/orange torch
                    const light = new THREE.PointLight(0xff5500, 2.5, 35);
                    light.position.set(px, 3, pz);
                    scene.add(light);
                    levelLights.push(light);
                } else if (val === 8) {
                    // Blue tech light
                    const light = new THREE.PointLight(0x2266ff, 2.2, 35);
                    light.position.set(px, 3, pz);
                    scene.add(light);
                    levelLights.push(light);
                } else if (val === 9) { 
                    const exitGeo = new THREE.CylinderGeometry(1.5, 1.5, TILE_SIZE, 16);
                    const exitMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 });
                    exitPortal = new THREE.Mesh(exitGeo, exitMat);
                    exitPortal.position.set(px, TILE_SIZE/2, pz);
                    scene.add(exitPortal);
                    
                    portalLight = new THREE.PointLight(0x00ff88, 3, 25);
                    portalLight.position.set(px, 3, pz);
                    scene.add(portalLight);
                }
                // val === 12 is just the player spawn marker — no geometry
            }
        }
        
        updateKillCounter();
    }, 100);

    drawMinimap(map);
    levelStartTime = Date.now();
    
    const levelNames = ['УРОВЕНЬ 1: Бункер', 'УРОВЕНЬ 2: Объект', 'УРОВЕНЬ 3: Врата Ада', 'УРОВЕНЬ 4: Логово Босса'];
    const popupColor = index === 3 ? '#ff00ff' : '#00ff88';
    showPopup(levelNames[index] || `ФИНАЛ`, popupColor);
}

function getLevelWalls() {
    return walls;
}

function spawnItemSprite(x, z, type) {
    if (!spriteMaterials[type]) {
        setTimeout(() => spawnItemSprite(x, z, type), 100);
        return;
    }
    const sprite = new THREE.Sprite(spriteMaterials[type].clone());
    sprite.scale.set(1.5, 1.5, 1);
    sprite.position.set(x, 0.75, z);
    if (type === 'plasma') sprite.material.color.setHex(0x00ffff);
    else if (type === 'rifle') sprite.material.color.setHex(0xaaaaaa);
    sprite.userData = { isItem: true, type: type };
    scene.add(sprite);
    items.push(sprite);
}

function updateItems(delta) {
    // Gentle floating animation for items
    items.forEach(item => {
        item.position.y = 0.75 + Math.sin(Date.now() * 0.003 + item.position.x) * 0.2;
    });
    
    // Portal rotation and pulse
    if (exitPortal) {
        exitPortal.rotation.y += delta * 2;
        exitPortal.material.opacity = 0.35 + Math.sin(Date.now() * 0.005) * 0.2;
    }
    if (portalLight) {
        portalLight.intensity = 3 + Math.sin(Date.now() * 0.006) * 1.5;
    }
    
    // Flicker torch / pulse blue lights
    levelLights.forEach((light, i) => {
        if (light.color.r > 0.5) {
            // Red torch: harsh flicker
            light.intensity = 2.5 + (Math.random() > 0.85 ? -1.5 : 0) + Math.sin(Date.now() * 0.01 + i * 100) * 0.4;
        } else {
            // Blue: slow cool pulse
            light.intensity = 2.2 + Math.sin(Date.now() * 0.002 + i) * 0.8;
        }
    });
}

function updateKillCounter() {
    const el = document.getElementById('enemies-left');
    if (el && typeof getEnemies === 'function') {
        el.textContent = getEnemies().length;
    }
}

function drawMinimap(map) {
    const canvas = document.getElementById('minimap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const cellW = canvas.width / map[0].length;
    const cellH = canvas.height / map.length;
    
    for (let z = 0; z < map.length; z++) {
        for (let x = 0; x < map[0].length; x++) {
            const val = map[z][x];
            if (val === 1 || val === 13 || val === 14) {
                ctx.fillStyle = '#445544';
                ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
            } else if (val === 15) {
                ctx.fillStyle = '#7a4f2b';
                ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
            } else if (val === 9) {
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
            } else if (val === 7) {
                ctx.fillStyle = 'rgba(255,100,0,0.5)';
                ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
            } else if (val === 8) {
                ctx.fillStyle = 'rgba(50,100,255,0.5)';
                ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
            } else if (val === 17) {
                ctx.fillStyle = 'rgba(255,0,0,0.8)';
                ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
            } else if (val === 12) {
                ctx.fillStyle = 'rgba(0,255,0,0.3)';
                ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
            }
        }
    }
}

function updateMinimapPlayer() {
    const canvas = document.getElementById('minimap');
    if (!canvas || !levels[currentLevel]) return;
    const ctx = canvas.getContext('2d');
    
    drawMinimap(levels[currentLevel]);
    
    const mapWidth = levels[currentLevel][0].length;
    const mapHeight = levels[currentLevel].length;
    const offsetX = (mapWidth * TILE_SIZE) / 2;
    const offsetZ = (mapHeight * TILE_SIZE) / 2;
    
    const px = controls.getObject().position.x + offsetX;
    const pz = controls.getObject().position.z + offsetZ;
    
    const cellW = canvas.width / mapWidth;
    const cellH = canvas.height / mapHeight;
    
    const mapX = (px / TILE_SIZE) * cellW;
    const mapZ = (pz / TILE_SIZE) * cellH;
    
    // Enemies as red dots
    if (typeof getEnemies === 'function') {
        getEnemies().forEach(e => {
            const ex = (e.position.x + offsetX) / TILE_SIZE * cellW;
            const ez = (e.position.z + offsetZ) / TILE_SIZE * cellH;
            ctx.fillStyle = '#f44';
            ctx.beginPath();
            ctx.arc(ex, ez, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    // Loot items as yellow dots
    items.forEach(item => {
        const ix = (item.position.x + offsetX) / TILE_SIZE * cellW;
        const iz = (item.position.z + offsetZ) / TILE_SIZE * cellH;
        ctx.fillStyle = '#ffdd00';
        ctx.beginPath();
        ctx.arc(ix, iz, 1.5, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Player as bright green triangle pointing in view direction
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(mapX, mapZ, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mapX, mapZ, 1.5, 0, Math.PI * 2);
    ctx.fill();
}
