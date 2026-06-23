// Player Movement, Physics, and Jumping

const playerSpeed = 40.0;
const runSpeed = 70.0;
const gravity = 30.0;
const jumpVelocity = 14.0;
const playerHeight = 2.0;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isRunning = false;
let canJump = false;
let jumpCount = 0;
let currentGroundY = 0; // Tracks the height of the object the player is standing on

let bobTimer = 0;
let footstepTimer = 0;

function initPlayer() {
    updateHUD();
}

// ── CHEAT CODES (Easter Eggs) ──
let cheatBuffer = '';
const CHEATS = {
    'boom': () => {
        playerStats.health = 999;
        playerStats.maxHealth = 999;
        playerStats.armor = 999;
        playerStats.maxArmor = 999;
        playerStats.lives = 99;
        playerStats.hasShotgun = true;
        playerStats.hasRifle = true;
        playerStats.hasPlasma = true;
        playerStats.ammo = 999;
        setWeaponSprite(3);
        playerStats.currentWeapon = 3;
        showPopup('БОЖЕСТВЕННЫЙ АРСЕНАЛ!', '#ff00ff');
        updateHUD();
    },
    'win': () => {
        if (typeof loadLevel === 'function' && typeof levels !== 'undefined') {
            loadLevel(levels.length);
        }
    }
};

window.addEventListener('keydown', (e) => {
    if (e.code && e.code.startsWith('Key')) {
        cheatBuffer += e.code.replace('Key', '').toLowerCase();
        if (cheatBuffer.length > 10) cheatBuffer = cheatBuffer.substring(cheatBuffer.length - 10);
        for (let code in CHEATS) {
            if (cheatBuffer.endsWith(code)) {
                CHEATS[code]();
                cheatBuffer = '';
            }
        }
    }
});

function updateHUD() {
    const healthEl = document.getElementById('health-value');
    const armorEl = document.getElementById('armor-value');
    const ammoEl = document.getElementById('ammo-value');
    const scoreEl = document.getElementById('score-value');
    const weaponEl = document.getElementById('weapon-name');
    const healthBar = document.getElementById('health-bar');
    const armorBar = document.getElementById('armor-bar');
    
    const livesEl = document.getElementById('lives-value');
    if (healthEl) healthEl.textContent = playerStats.health;
    if (armorEl) armorEl.textContent = playerStats.armor;
    if (ammoEl) ammoEl.textContent = playerStats.currentWeapon === 0 ? '∞' : playerStats.ammo;
    if (scoreEl) scoreEl.textContent = score;
    if (livesEl) livesEl.textContent = '❤️'.repeat(playerStats.lives) || '0';
    
    let wName = 'ПИСТОЛЕТ';
    if (playerStats.currentWeapon === 1) wName = 'ДРОБОВИК';
    if (playerStats.currentWeapon === 2) wName = 'ВИНТОВКА';
    if (playerStats.currentWeapon === 3) wName = 'ПЛАЗМОГАН';
    if (weaponEl) weaponEl.innerText = wName;
    
    // Health bar width
    if (healthBar) healthBar.style.width = `${(playerStats.health / playerStats.maxHealth) * 100}%`;
    if (armorBar) armorBar.style.width = `${(playerStats.armor / playerStats.maxArmor) * 100}%`;
    
    // Color change at low health
    if (healthEl && playerStats.health <= 30) {
        healthEl.style.color = '#ff0000';
        healthEl.style.textShadow = '0 0 10px rgba(255,0,0,0.8)';
    } else if (healthEl) {
        healthEl.style.color = '#ff4444';
        healthEl.style.textShadow = 'none';
    }
}

function setWeaponSprite(index) {
    const wSprite = document.getElementById('weapon-sprite');
    if (!wSprite) return;
    wSprite.style.filter = 'none';
    wSprite.style.mixBlendMode = 'normal';
    
    if (index === 0) wSprite.src = 'assets/pistol.png';
    else if (index === 1) wSprite.src = 'assets/weapon.png';
    else if (index === 2) wSprite.src = 'assets/rifle.png';
    else if (index === 3) {
        wSprite.src = 'assets/plasma.png';
    }
}

function takeDamage(amount) {
    if (invulnerabilityTimer > 0) return; // Invulnerability frames active

    let damageToHealth = amount;
    if (playerStats.armor > 0) {
        const armorDmg = Math.min(amount * 0.5, playerStats.armor);
        playerStats.armor = Math.round(playerStats.armor - armorDmg);
        damageToHealth -= armorDmg;
    }
    
    playerStats.health = Math.max(0, playerStats.health - Math.ceil(damageToHealth));
    
    // Screen flash
    const flash = document.getElementById('damage-flash');
    flash.style.background = 'rgba(255, 0, 0, 0.4)';
    setTimeout(() => { flash.style.background = 'rgba(255, 0, 0, 0)'; }, 150);
    
    updateHUD();
    
    // Camera shake
    controls.getObject().position.x += (Math.random() - 0.5) * 0.4;
    controls.getObject().position.y += (Math.random() - 0.5) * 0.3;
    
    if (playerStats.health <= 0) {
        if (playerStats.lives > 0) {
            // Resurrection
            playerStats.lives -= 1;
            playerStats.health = playerStats.maxHealth;
            updateHUD();
            
            showPopup('ВОСКРЕШЕНИЕ!', '#ffffff');
            const rFlash = document.getElementById('resurrection-flash');
            if (rFlash) {
                rFlash.style.opacity = '1';
                setTimeout(() => rFlash.style.opacity = '0', 100);
            }
            // Give 3 seconds of invulnerability
            invulnerabilityTimer = 3.0;
        } else {
            // Real Game Over
            gameState = 'GAMEOVER';
            if (typeof bgMusic !== 'undefined') bgMusic.pause();
            document.exitPointerLock();
            const el = document.getElementById('game-over');
            el.style.display = 'flex';
            document.getElementById('death-stats').innerHTML = 
                `Убито врагов: ${totalKills}<br>Очки: ${score}`;
        }
    }
}

const onKeyDown = function (event) {
    if (gameState !== 'PLAYING') return;
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = true; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = true; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = true; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': isRunning = true; break;
        case 'Space':
            if (canJump === true) {
                velocity.y = jumpVelocity;
                canJump = false;
                jumpCount = 1;
            } else if (jumpCount === 1) {
                // Double jump!
                velocity.y = jumpVelocity;
                jumpCount = 2;
            }
            break;
        case 'Digit1':
            playerStats.currentWeapon = 0;
            setWeaponSprite(0);
            updateHUD();
            break;
        case 'Digit2':
            if (playerStats.hasShotgun) {
                playerStats.currentWeapon = 1;
                setWeaponSprite(1);
                updateHUD();
            }
            break;
        case 'Digit3':
            if (playerStats.hasRifle) {
                playerStats.currentWeapon = 2;
                setWeaponSprite(2);
                updateHUD();
            }
            break;
        case 'Digit4':
            if (playerStats.hasPlasma) {
                playerStats.currentWeapon = 3;
                setWeaponSprite(3);
                updateHUD();
            }
            break;
    }
};

const onKeyUp = function (event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = false; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = false; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = false; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': isRunning = false; break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Reset all movement flags when window loses focus (prevents stuck keys)
function resetMovementState() {
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    isRunning = false;
}
window.addEventListener('blur', resetMovementState);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetMovementState(); });

function resolveCollision(position) {
    currentGroundY = 0; // Default ground is 0
    if (typeof getLevelWalls === 'function') {
        const walls = getLevelWalls();
        for (let i = 0; i < walls.length; i++) {
            const wall = walls[i];
            const dx = position.x - wall.position.x;
            const dz = position.z - wall.position.z;
            
            // Get dimensions based on geometry type
            let radiusX = 2.0;
            let radiusZ = 2.0;
            let topY = 4.0;
            
            if (wall.geometry.type === 'BoxGeometry') {
                radiusX = wall.geometry.parameters.width / 2;
                radiusZ = wall.geometry.parameters.depth / 2;
                topY = wall.position.y + wall.geometry.parameters.height / 2;
            } else if (wall.geometry.type === 'CylinderGeometry') {
                radiusX = wall.geometry.parameters.radiusTop;
                radiusZ = wall.geometry.parameters.radiusTop;
                topY = wall.position.y + wall.geometry.parameters.height / 2;
            }
            
            const absDx = Math.abs(dx);
            const absDz = Math.abs(dz);
            
            // Player radius is roughly 0.5
            if (absDx < radiusX + 0.5 && absDz < radiusZ + 0.5) {
                const playerBottom = position.y - playerHeight;
                
                // If player is falling onto the object, or already standing on it
                if (playerBottom >= topY - 0.6) {
                    // Update ground level
                    if (topY > currentGroundY) currentGroundY = topY;
                } else {
                    // Push player out on the axis of least penetration
                    const overlapX = (radiusX + 0.5) - absDx;
                    const overlapZ = (radiusZ + 0.5) - absDz;
                    if (overlapX < overlapZ) {
                        position.x += dx > 0 ? overlapX : -overlapX;
                    } else {
                        position.z += dz > 0 ? overlapZ : -overlapZ;
                    }
                }
            }
        }
    }
}

function checkInteractions(position) {
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (position.distanceTo(item.position) < 2.5) {
            const type = item.userData.type;
            let picked = false;
            
            if (type === 'medkit' && playerStats.health < playerStats.maxHealth) {
                playerStats.health = Math.min(playerStats.health + 25, playerStats.maxHealth);
                showPopup('АПТЕЧКА +25', '#00ff00');
                picked = true;
            } else if (type === 'armor' && playerStats.armor < playerStats.maxArmor) {
                playerStats.armor = Math.min(playerStats.armor + 50, playerStats.maxArmor);
                showPopup('БРОНЯ +50', '#44aaff');
                picked = true;
            } else if (type === 'ammo') {
                playerStats.ammo += 20;
                showPopup('ПАТРОНЫ +20', '#ffaa00');
                picked = true;
            } else if (type === 'shotgun') {
                if (!playerStats.hasShotgun) {
                    playerStats.hasShotgun = true;
                    playerStats.currentWeapon = 1;
                    playerStats.ammo += 10;
                    setWeaponSprite(1);
                    showPopup('ДРОБОВИК ПОЛУЧЕН!', '#ff6600');
                } else {
                    playerStats.ammo += 10;
                    showPopup('ПАТРОНЫ +10', '#ffaa00');
                }
                picked = true;
            } else if (type === 'rifle') {
                if (!playerStats.hasRifle) {
                    playerStats.hasRifle = true;
                    playerStats.currentWeapon = 2;
                    playerStats.ammo += 30;
                    setWeaponSprite(2);
                    showPopup('ВИНТОВКА ПОЛУЧЕНА!', '#aaaaaa');
                } else {
                    playerStats.ammo += 30;
                    showPopup('ПАТРОНЫ +30', '#ffaa00');
                }
                picked = true;
            } else if (type === 'plasma') {
                if (!playerStats.hasPlasma) {
                    playerStats.hasPlasma = true;
                    playerStats.currentWeapon = 3;
                    playerStats.ammo += 50;
                    setWeaponSprite(3);
                    showPopup('ПЛАЗМОГАН ПОЛУЧЕН!', '#00ffff');
                } else {
                    playerStats.ammo += 50;
                    showPopup('ПАТРОНЫ +50', '#ffaa00');
                }
                picked = true;
            }
            
            if (picked) {
                playSound('pickup');
                
                const flash = document.getElementById('damage-flash');
                flash.style.background = 'rgba(0, 255, 0, 0.15)';
                setTimeout(() => { flash.style.background = 'rgba(0, 255, 0, 0)'; }, 100);
                
                score += 10;
                updateHUD();
                scene.remove(item);
                items.splice(i, 1);
            }
        }
    }
    
    if (exitPortal && position.distanceTo(exitPortal.position) < 3) {
        const enems = typeof getEnemies === 'function' ? getEnemies() : [];
        if (enems.length > 0) {
            showPopup(`СНАЧАЛА УБЕЙТЕ ВСЕХ ВРАГОВ! Осталось: ${enems.length}`, '#ff0000');
            
            // Push player back slightly to avoid rapid popup spam
            const pushDir = new THREE.Vector3().subVectors(controls.getObject().position, exitPortal.position).normalize();
            controls.getObject().position.add(pushDir.multiplyScalar(0.5));
            return;
        }
        
        playSound('portal');
        
        const elapsed = Math.round((Date.now() - levelStartTime) / 1000);
        const timeBonus = Math.max(0, 300 - elapsed) * 10;
        score += timeBonus;
        
        // Show level complete
        gameState = 'VICTORY';
        if (typeof bgMusic !== 'undefined') bgMusic.pause();
        document.exitPointerLock();
        const el = document.getElementById('victory');
        el.style.display = 'flex';
        document.getElementById('victory-stats').innerHTML = 
            `Время: ${elapsed} сек.<br>Бонус: +${timeBonus} очков<br>Счёт: ${score}`;
        
        currentLevel++;
    }
}

function updatePlayer(delta) {
    if (gameState !== 'PLAYING') return;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= gravity * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); 

    const currentSpeed = isRunning ? runSpeed : playerSpeed;

    if (moveForward || moveBackward) velocity.z -= direction.z * currentSpeed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * currentSpeed * delta;

    const playerObj = controls.getObject();
    
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    
    // Smooth collision resolution
    resolveCollision(playerObj.position);

    playerObj.position.y += (velocity.y * delta);
    const targetY = currentGroundY + playerHeight;
    
    if (playerObj.position.y <= targetY) {
        velocity.y = 0;
        playerObj.position.y = targetY;
        canJump = true;
        jumpCount = 0;
    } else if (canJump && velocity.y === 0 && playerObj.position.y > targetY) {
        // Walked off an edge
        canJump = false;
        jumpCount = 1; // Allows a single mid-air jump
    }

    checkInteractions(playerObj.position);

    // Head/Weapon bobbing + footstep sounds
    const weaponSprite = document.getElementById('weapon-sprite');
    const isMoving = (moveForward || moveBackward || moveLeft || moveRight) && canJump;
    
    if (isMoving) {
        const bobSpeed = isRunning ? 15 : 10;
        bobTimer += delta * bobSpeed;
        playerObj.position.y = targetY + Math.sin(bobTimer) * 0.1;
        
        if (weaponSprite) {
            const swayX = Math.cos(bobTimer) * 15;
            const swayY = Math.abs(Math.sin(bobTimer)) * 15;
            weaponSprite.style.transform = `translateX(calc(-50% + ${swayX}px)) translateY(${swayY}px)`;
        }
        
        // Footstep sounds
        footstepTimer -= delta;
        if (footstepTimer <= 0) {
            playSound('footstep');
            footstepTimer = isRunning ? 0.25 : 0.4;
        }
    } else {
        bobTimer = 0;
        footstepTimer = 0;
        if (weaponSprite) {
            weaponSprite.style.transform = `translateX(-50%) translateY(0px)`;
        }
    }
    
    // Invulnerability blinking
    if (invulnerabilityTimer > 0) {
        invulnerabilityTimer -= delta;
        if (weaponSprite) {
            weaponSprite.style.opacity = (Math.floor(invulnerabilityTimer * 10) % 2 === 0) ? '0.5' : '1.0';
        }
        if (invulnerabilityTimer <= 0 && weaponSprite) {
            weaponSprite.style.opacity = '1.0';
        }
    }
    
    if (typeof updateMinimapPlayer === 'function') updateMinimapPlayer();
}
