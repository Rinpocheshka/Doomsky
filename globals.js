// Global variables and Game State

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, 0.035); // Exponential fog — denser, more atmospheric

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: false });
let composer, bloomPass;
const controls = new THREE.PointerLockControls(camera, document.body);
const clock = new THREE.Clock();

// Game State
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER, VICTORY, FINAL_VICTORY
let currentLevel = 0;
let score = 0;
let totalKills = 0;
let levelStartTime = 0;
let invulnerabilityTimer = 0;
let hitStopTimer = 0;

let playerStats = {
    health: 100,
    armor: 0,
    ammo: 0,
    lives: 3,
    maxHealth: 100,
    maxArmor: 100,
    maxLives: 3,
    currentWeapon: 0, // 0=Pistol, 1=Shotgun, 2=Rifle, 3=Plasma
    hasShotgun: false,
    hasRifle: false,
    hasPlasma: false
};

const items = [];
const levelLights = []; // Dynamic point lights per level

// ──── Audio Context ────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const bgMusic = new Audio('assets/Teeth_of_the_Machine.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;

// ──── Sound Effects ────
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    switch(type) {
        case 'pickup': {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.3, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.connect(g); g.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.15);
            break;
        }
        case 'hit': {
            // Modern FPS hitmarker sound (high pitched tick + low thud)
            const osc = audioCtx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
            
            const g1 = audioCtx.createGain(); 
            g1.gain.setValueAtTime(0.5, audioCtx.currentTime);
            g1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            
            osc.connect(g1); g1.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);

            // Thud noise
            const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
            const s = audioCtx.createBufferSource(); s.buffer = buf;
            const g2 = audioCtx.createGain(); g2.gain.setValueAtTime(0.4, audioCtx.currentTime);
            g2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
            s.connect(g2); g2.connect(audioCtx.destination);
            s.start(); s.stop(audioCtx.currentTime + 0.08);
            break;
        }
        case 'alert': {
            const osc = audioCtx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.35, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.connect(g); g.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
            break;
        }
        case 'enemy_die': {
            const osc = audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.5, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.connect(g); g.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.4);
            break;
        }
        case 'footstep': {
            const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3 * (1 - i / d.length);
            const s = audioCtx.createBufferSource(); s.buffer = buf;
            const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
            const g = audioCtx.createGain(); g.gain.value = 0.15;
            s.connect(f); f.connect(g); g.connect(audioCtx.destination); s.start();
            break;
        }
        case 'portal': {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.5);
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.3, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
            osc.connect(g); g.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.6);
            break;
        }
        case 'boss_fire': {
            // Deep rumbling fireball sound
            const osc = audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.25);
            const noise = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
            const nd = noise.getChannelData(0);
            for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
            const ns = audioCtx.createBufferSource(); ns.buffer = noise;
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.5, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.connect(g); ns.connect(g); g.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
            ns.start(); ns.stop(audioCtx.currentTime + 0.3);
            break;
        }
        case 'boss_death': {
            // Epic explosion sound
            const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.5, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 0.5);
            const s = audioCtx.createBufferSource(); s.buffer = buf;
            const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
            f.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 1.5);
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.8, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
            s.connect(f); f.connect(g); g.connect(audioCtx.destination);
            s.start(); s.stop(audioCtx.currentTime + 1.5);
            break;
        }
    }
}

// ──── Popup Message System ────
function showPopup(text, color = '#ffaa00') {
    const container = document.getElementById('popup-container');
    if (!container) return;
    const msg = document.createElement('div');
    msg.className = 'popup-msg';
    msg.textContent = text;
    msg.style.color = color;
    container.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
}

// ──── Transparent Texture Loader ────
function loadTransparentTexture(url, callback) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if ((data[i] < 30 && data[i+1] < 30 && data[i+2] < 30) ||
                (data[i] > 200 && data[i+1] > 200 && data[i+2] > 200)) {
                data[i+3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        if (callback) callback(texture);
    };
    img.src = url;
}

// ──── Particle System (for enemy death) ────
const particles = [];
const sharedParticleGeo = new THREE.SphereGeometry(0.1, 4, 4); // Shared — no per-particle alloc

function spawnParticles(position, count, color) {
    for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true });
        const p = new THREE.Mesh(sharedParticleGeo, mat);
        p.position.copy(position);
        p.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            Math.random() * 8 + 2,
            (Math.random() - 0.5) * 10
        );
        p.userData.life = 0.8 + Math.random() * 0.4;
        scene.add(p);
        particles.push(p);
    }
}

function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.userData.life -= delta;
        p.position.add(p.userData.velocity.clone().multiplyScalar(delta));
        p.userData.velocity.y -= 15 * delta; // gravity
        p.material.opacity = Math.max(0, p.userData.life);
        p.material.transparent = true;
        if (p.userData.life <= 0) {
            scene.remove(p);
            p.material.dispose(); // geometry is shared, don't dispose it
            particles.splice(i, 1);
        }
    }
}
