// Weapons and Shooting Logic

let isShooting = false;
const raycaster = new THREE.Raycaster();
const tracers = [];

// ── Weapon Sounds ──
function playShotgunSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const bufferSize = audioCtx.sampleRate * 0.3;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.25);
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noise.start();
}

function playPistolSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(500, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.12);
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
}

function playRifleSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const bufferSize = audioCtx.sampleRate * 0.1;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noise.start();
}

function playPlasmaSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.3);
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// ── Chroma Key (for HUD weapon sprite) ──
function removeBackground(imgElement) {
    if (!imgElement.src || imgElement.src.startsWith('data:')) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgElement.src;
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if ((data[i] > 200 && data[i+1] > 200 && data[i+2] > 200) || 
                (data[i] < 30 && data[i+1] < 30 && data[i+2] < 30)) {
                data[i+3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        imgElement.src = canvas.toDataURL('image/png');
    };
}

window.addEventListener('load', () => {
    const weaponSprite = document.getElementById('weapon-sprite');
    if (weaponSprite) {
        removeBackground(weaponSprite);
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    removeBackground(weaponSprite);
                }
            });
        });
        observer.observe(weaponSprite, { attributes: true });
    }
    
    // Create muzzle flash element
    const ui = document.getElementById('ui');
    const flash = document.createElement('div');
    flash.id = 'muzzle-flash';
    flash.style.cssText = `
        position: absolute; bottom: 280px; left: 50%; 
        transform: translateX(-50%); width: 80px; height: 80px;
        background: radial-gradient(circle, rgba(255,255,0,1) 0%, rgba(255,100,0,0.8) 40%, rgba(255,0,0,0) 80%);
        border-radius: 50%; display: none; pointer-events: none;
    `;
    ui.appendChild(flash);
});

// ── Shooting ──

let mouseIsDown = false;

document.addEventListener('mousedown', () => {
    mouseIsDown = true;
    if (gameState !== 'PLAYING' || !controls.isLocked) return;
    tryShoot();
});

document.addEventListener('mouseup', () => {
    mouseIsDown = false;
});

function tryShoot() {
    if (gameState !== 'PLAYING' || !controls.isLocked || isShooting) return;
    
    if (playerStats.currentWeapon > 0 && playerStats.ammo <= 0) {
        playerStats.currentWeapon = 0;
        if (typeof setWeaponSprite === 'function') setWeaponSprite(0);
        if (typeof updateHUD === 'function') updateHUD();
        return;
    }
    
    shoot();
}

function createTracer() {
    const material = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 });
    const points = [];
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    let endPoint = new THREE.Vector3();
    
    const enems = typeof getEnemies === 'function' ? getEnemies() : [];
    const walls = typeof getLevelWalls === 'function' ? getLevelWalls() : [];
    const intersects = raycaster.intersectObjects([...enems, ...walls]);
    if (intersects.length > 0) {
        endPoint.copy(intersects[0].point);
    } else {
        raycaster.ray.at(50, endPoint);
    }

    points.push(controls.getObject().position.clone().add(new THREE.Vector3(0,-0.5,0)));
    points.push(endPoint);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    
    tracers.push({ line: line, life: 0.08 });
}

function shoot() {
    isShooting = true;
    
    let damage = 20;
    let cooldown = 250;
    
    if (playerStats.currentWeapon === 1) { // Shotgun
        playerStats.ammo--;
        damage = 60;
        cooldown = 550;
        playShotgunSound();
    } else if (playerStats.currentWeapon === 2) { // Rifle
        playerStats.ammo--;
        damage = 25;
        cooldown = 120;
        playRifleSound();
    } else if (playerStats.currentWeapon === 3) { // Plasma
        if (playerStats.ammo < 5) {
            // Not enough ammo for plasma
            isShooting = false;
            playerStats.currentWeapon = 0;
            if (typeof setWeaponSprite === 'function') setWeaponSprite(0);
            if (typeof updateHUD === 'function') updateHUD();
            return;
        }
        playerStats.ammo -= 5;
        damage = 120;
        cooldown = 700;
        playPlasmaSound();
    } else {
        playPistolSound();
    }

    createTracer();

    // Visual Recoil
    const weaponSprite = document.getElementById('weapon-sprite');
    const muzzleFlash = document.getElementById('muzzle-flash');
    
    // Dynamic 3D muzzle light
    const mLight = new THREE.PointLight(0xffddaa, 3, 40);
    mLight.position.copy(controls.getObject().position);
    scene.add(mLight);
    
    let recoilAmount = '-30px';
    if (playerStats.currentWeapon === 1) recoilAmount = '-60px';
    if (playerStats.currentWeapon === 3) recoilAmount = '-50px';
    
    weaponSprite.style.bottom = recoilAmount;
    weaponSprite.style.transform = `translateX(-50%) scale(1.08) rotate(${(Math.random()-0.5)*6}deg)`;
    
    if (muzzleFlash) muzzleFlash.style.display = 'block';

    setTimeout(() => {
        weaponSprite.style.bottom = '80px';
        weaponSprite.style.transform = `translateX(-50%) scale(1) rotate(0deg)`;
        if (muzzleFlash) muzzleFlash.style.display = 'none';
        scene.remove(mLight);
        setTimeout(() => { isShooting = false; }, cooldown - 100);
    }, 100);

    // Hit Logic
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    if (typeof getEnemies === 'function') {
        const enemies = getEnemies();
        const intersects = raycaster.intersectObjects([...enemies, ...getLevelWalls()]);

        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            const hitPoint = intersects[0].point;
            
            if (hitObject.userData && hitObject.userData.isEnemy) {
                hitObject.userData.health -= damage;
                
                // Hit flash
                hitObject.material.color.setHex(0xff0000);
                setTimeout(() => {
                    if (hitObject.material) hitObject.material.color.setHex(0xffffff);
                }, 80);
                
                playSound('hit');
                // Blood particles
                spawnParticles(hitPoint, 5, 0xff0000);

                if (hitObject.userData.health <= 0) {
                    // Death!
                    playSound('enemy_die');
                    spawnParticles(hitObject.position.clone(), 15, 0xff2200);
                    
                    // 30% Loot Drop
                    if (Math.random() < 0.3) {
                        const roll = Math.random();
                        let dropType = 'ammo';
                        if (roll < 0.33) dropType = 'medkit';
                        else if (roll < 0.66) dropType = 'armor';
                        
                        if (typeof spawnItemSprite === 'function') {
                            spawnItemSprite(hitObject.position.x, hitObject.position.z, dropType);
                        }
                    }
                    
                    scene.remove(hitObject);
                    if(hitObject.userData.ui) hitObject.userData.ui.remove();
                    const index = enemies.indexOf(hitObject);
                    if (index > -1) enemies.splice(index, 1);
                    
                    totalKills++;
                    score += 100;
                    showPopup('+100', '#ff66ff');
                    
                    if (typeof updateHUD === 'function') updateHUD();
                    if (typeof updateKillCounter === 'function') updateKillCounter();
                }
            } else {
                // Wall hit particles
                spawnParticles(hitPoint, 4, 0x888888);
            }
        }
    }
    
    if (typeof updateHUD === 'function') updateHUD();
}

function updateWeapons(delta) {
    if (mouseIsDown && playerStats.currentWeapon === 2 && !isShooting) {
        tryShoot();
    }

    for (let i = tracers.length - 1; i >= 0; i--) {
        tracers[i].life -= delta;
        if (tracers[i].life <= 0) {
            scene.remove(tracers[i].line);
            tracers[i].line.geometry.dispose();
            tracers[i].line.material.dispose();
            tracers.splice(i, 1);
        }
    }
}
