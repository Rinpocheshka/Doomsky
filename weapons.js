// Weapons and Shooting Logic

let isShooting = false;
const raycaster = new THREE.Raycaster();
const tracers = [];
const _screenCenter = new THREE.Vector2(0, 0); // Reused per shot

// Track muzzle light to prevent accumulation on rapid fire
let activeMuzzleLight = null;

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
    noise.stop(audioCtx.currentTime + 0.3); // BUG FIX: was never stopped
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
    noise.stop(audioCtx.currentTime + 0.1); // BUG FIX: audio node leak fixed
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
    // Skip chroma-key for plasma — it uses mix-blend-mode:screen instead
    if (imgElement.src.includes('plasma.png')) return;
    
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

// Auto-switch to best available weapon when current is out of ammo
function autoSwitchWeapon() {
    if (playerStats.hasPlasma && playerStats.ammo >= 5) {
        playerStats.currentWeapon = 3;
    } else if (playerStats.hasRifle && playerStats.ammo > 0) {
        playerStats.currentWeapon = 2;
    } else if (playerStats.hasShotgun && playerStats.ammo > 0) {
        playerStats.currentWeapon = 1;
    } else {
        playerStats.currentWeapon = 0; // Pistol: infinite
    }
    if (typeof setWeaponSprite === 'function') setWeaponSprite(playerStats.currentWeapon);
    if (typeof updateHUD === 'function') updateHUD();
    showPopup('НЕТ ПАТРОНОВ → СМЕНА ОРУЖИЯ', '#ffaa00');
}

function tryShoot() {
    if (gameState !== 'PLAYING' || !controls.isLocked || isShooting) return;
    
    const w = playerStats.currentWeapon;
    // Check ammo availability per weapon
    if (w === 1 && playerStats.ammo <= 0) { autoSwitchWeapon(); return; }
    if (w === 2 && playerStats.ammo <= 0) { autoSwitchWeapon(); return; }
    if (w === 3 && playerStats.ammo < 5) { autoSwitchWeapon(); return; }
    
    shoot();
}

function createTracer(hitIntersects) {
    const material = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 });
    const points = [];
    
    let endPoint = new THREE.Vector3();
    if (hitIntersects && hitIntersects.length > 0) {
        endPoint.copy(hitIntersects[0].point);
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
    let flashColor = 'rgba(255,200,0,1)';
    
    if (playerStats.currentWeapon === 1) { // Shotgun
        playerStats.ammo--;
        damage = 60;
        cooldown = 550;
        playShotgunSound();
        screenShake(0.4, 150);
    } else if (playerStats.currentWeapon === 2) { // Rifle
        playerStats.ammo--;
        damage = 25;
        cooldown = 120;
        playRifleSound();
    } else if (playerStats.currentWeapon === 3) { // Plasma
        playerStats.ammo -= 5;
        damage = 120;
        cooldown = 700;
        flashColor = 'rgba(0,200,255,1)';
        playPlasmaSound();
        screenShake(0.3, 200);
    } else {
        playPistolSound();
    }

    // ── Single raycaster call — results reused for tracer AND hit detection ──
    raycaster.setFromCamera(_screenCenter, camera);
    const enems = typeof getEnemies === 'function' ? getEnemies() : [];
    const levelWalls = typeof getLevelWalls === 'function' ? getLevelWalls() : [];
    const allIntersects = raycaster.intersectObjects([...enems, ...levelWalls]);
    
    createTracer(allIntersects);

    // Visual Recoil
    const weaponSprite = document.getElementById('weapon-sprite');
    const muzzleFlash = document.getElementById('muzzle-flash');
    
    // Dynamic 3D muzzle light — remove previous if still active
    if (activeMuzzleLight) {
        scene.remove(activeMuzzleLight);
        activeMuzzleLight = null;
    }
    const mLightColor = playerStats.currentWeapon === 3 ? 0x00ddff : 0xffddaa;
    activeMuzzleLight = new THREE.PointLight(mLightColor, 3, 40);
    activeMuzzleLight.position.copy(controls.getObject().position);
    scene.add(activeMuzzleLight);
    
    let recoilAmount = '-30px';
    if (playerStats.currentWeapon === 1) recoilAmount = '-60px';
    if (playerStats.currentWeapon === 3) recoilAmount = '-50px';
    
    if (weaponSprite) {
        weaponSprite.style.bottom = recoilAmount;
        weaponSprite.style.transform = `translateX(-50%) scale(1.08) rotate(${(Math.random()-0.5)*6}deg)`;
    }
    
    if (muzzleFlash) {
        muzzleFlash.style.background = `radial-gradient(circle, ${flashColor} 0%, rgba(255,100,0,0.8) 40%, rgba(255,0,0,0) 80%)`;
        muzzleFlash.style.display = 'block';
    }

    setTimeout(() => {
        if (weaponSprite) {
            weaponSprite.style.bottom = '80px';
            weaponSprite.style.transform = `translateX(-50%) scale(1) rotate(0deg)`;
        }
        if (muzzleFlash) muzzleFlash.style.display = 'none';
        if (activeMuzzleLight) {
            scene.remove(activeMuzzleLight);
            activeMuzzleLight = null;
        }
        setTimeout(() => { isShooting = false; }, cooldown - 100);
    }, 100);

    // Hit Logic — reuses allIntersects computed above
    if (allIntersects.length > 0) {
        const hitObject = allIntersects[0].object;
        const hitPoint = allIntersects[0].point;
        
        if (hitObject.userData && hitObject.userData.isEnemy) {
            hitObject.userData.health -= damage;
            
            // Hit flash
            hitObject.material.color.setHex(0xff0000);
            setTimeout(() => {
                if (hitObject.material) hitObject.material.color.setHex(0xffffff);
            }, 80);
            
            playSound('hit');
            showHitMarker();
            // Blood particles
            spawnParticles(hitPoint, 5, 0xff0000);

            // Update boss HP bar if applicable
            if (hitObject.userData.type === 3) {
                updateBossHPBar(hitObject.userData.health, hitObject.userData.maxHealth);
            }

            if (hitObject.userData.health <= 0) {
                // Death!
                playSound('enemy_die');
                spawnParticles(hitObject.position.clone(), 15, 0xff2200);

                // Hide boss bar on death
                if (hitObject.userData.type === 3) {
                    const bossBar = document.getElementById('boss-hpbar-container');
                    if (bossBar) bossBar.style.display = 'none';
                }
                
                // 30% Loot Drop (boss always drops loot)
                const dropRoll = Math.random();
                const isBoss = hitObject.userData.type === 3;
                if (isBoss || dropRoll < 0.3) {
                    const roll = Math.random();
                    let dropType = 'ammo';
                    if (roll < 0.33) dropType = 'medkit';
                    else if (roll < 0.66) dropType = 'armor';
                    
                    if (typeof spawnItemSprite === 'function') {
                        spawnItemSprite(hitObject.position.x, hitObject.position.z, dropType);
                        if (isBoss) {
                            // Boss drops extra loot
                            spawnItemSprite(hitObject.position.x + 2, hitObject.position.z, 'medkit');
                            spawnItemSprite(hitObject.position.x - 2, hitObject.position.z, 'armor');
                        }
                    }
                }
                
                scene.remove(hitObject);
                if(hitObject.userData.ui) hitObject.userData.ui.remove();
                const idx = enems.indexOf(hitObject);
                if (idx > -1) enems.splice(idx, 1);
                
                totalKills++;
                const killScore = isBoss ? 1000 : 100;
                score += killScore;
                showPopup(isBoss ? '⚠ БОСС ПОВЕРЖЕН! +1000' : '+100', isBoss ? '#ff00ff' : '#ff66ff');
                
                if (typeof updateHUD === 'function') updateHUD();
                if (typeof updateKillCounter === 'function') updateKillCounter();
            }
        } else {
            // Wall hit particles
            spawnParticles(hitPoint, 4, 0x888888);
        }
    }
    
    if (typeof updateHUD === 'function') updateHUD();
}

function updateBossHPBar(hp, maxHp) {
    const container = document.getElementById('boss-hpbar-container');
    const fill = document.getElementById('boss-hpbar-fill');
    const hpText = document.getElementById('boss-hp-text');
    if (!container || !fill) return;
    container.style.display = 'flex';
    const pct = Math.max(0, (hp / maxHp) * 100);
    fill.style.width = pct + '%';
    if (hpText) hpText.textContent = `БОСС  ${Math.ceil(hp)} / ${maxHp}`;
}

function updateWeapons(delta) {
    // Auto-fire only for Rifle
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

// ── Hit Marker ──
function showHitMarker() {
    const marker = document.getElementById('hit-marker');
    if (!marker) return;
    marker.style.opacity = '1';
    marker.style.transform = 'translate(-50%, -50%) scale(1.2)';
    setTimeout(() => {
        marker.style.opacity = '0';
        marker.style.transform = 'translate(-50%, -50%) scale(0.8)';
    }, 120);
}

// ── Screen Shake ──
function screenShake(intensity, duration) {
    const playerObj = controls.getObject();
    const origY = playerObj.position.y;
    const steps = Math.ceil(duration / 16);
    let step = 0;
    const interval = setInterval(() => {
        step++;
        const decay = 1 - step / steps;
        playerObj.position.x += (Math.random() - 0.5) * intensity * decay;
        playerObj.position.y = origY + (Math.random() - 0.5) * intensity * decay * 0.5;
        if (step >= steps) {
            clearInterval(interval);
            playerObj.position.y = origY;
        }
    }, 16);
}
