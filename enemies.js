// Enemy AI and Logic

const enemies = [];
const enemyMaterials = [];

loadTransparentTexture('assets/monster.png', (texture) => {
    enemyMaterials[0] = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true });
});
loadTransparentTexture('assets/enemy2.png', (texture) => {
    enemyMaterials[1] = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true });
});
loadTransparentTexture('assets/enemy3.png', (texture) => {
    enemyMaterials[2] = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true });
});
loadTransparentTexture('assets/boss.png', (texture) => {
    enemyMaterials[3] = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true });
});

// Enemy type definitions — tuned per level for fair but escalating challenge
const ENEMY_DEFS = [
    // Type 0: Basic Grunt — slow, predictable, low HP. Level 1 staple.
    { hp: 70,  speed: 7,  damage: 8,  detRange: 22, size: 2.8, attackRate: 1.0, retreatChance: 0.05 },
    // Type 1: Runner   — faster, moderate HP, aggressive. Level 2 staple.
    { hp: 110, speed: 13, damage: 13, detRange: 28, size: 3.0, attackRate: 0.7, retreatChance: 0.10 },
    // Type 2: Tank     — slow, very high HP, heavy damage. Level 3 boss-tier.
    { hp: 200, speed: 6,  damage: 22, detRange: 30, size: 3.5, attackRate: 1.4, retreatChance: 0.02 },
    // Type 3: Boss     — massive HP, fast, huge damage. Level 4 finale.
    { hp: 800, speed: 9,  damage: 35, detRange: 50, size: 5.5, attackRate: 1.1, retreatChance: 0.0 },
];

function spawnEnemy(x, z, overrideType = null) {
    // Pick type based on current level with weighted random mix
    let typeLvl;
    if (overrideType !== null) {
        typeLvl = overrideType;
    } else if (currentLevel === 0) {
        // Level 1: only grunts (type 0)
        typeLvl = 0;
    } else if (currentLevel === 1) {
        // Level 2: 60% grunts, 40% runners
        typeLvl = Math.random() < 0.6 ? 0 : 1;
    } else if (currentLevel === 2) {
        // Level 3: 25% grunts, 40% runners, 35% tanks
        const r = Math.random();
        if (r < 0.25) typeLvl = 0;
        else if (r < 0.65) typeLvl = 1;
        else typeLvl = 2;
    } else {
        // Level 4: 20% grunts, 40% runners, 40% tanks (Boss spawns via override)
        const r = Math.random();
        if (r < 0.2) typeLvl = 0;
        else if (r < 0.6) typeLvl = 1;
        else typeLvl = 2;
    }

    const matIdx = Math.min(typeLvl, enemyMaterials.length - 1);
    if (!enemyMaterials[matIdx]) {
        setTimeout(() => spawnEnemy(x, z), 100);
        return;
    }
    
    const def = ENEMY_DEFS[typeLvl];
    const enemy = new THREE.Sprite(enemyMaterials[matIdx].clone());
    enemy.scale.set(def.size, def.size, 1);
    enemy.position.set(x, 1.5, z);
    
    const uiContainer = document.getElementById('enemy-ui-container');
    const healthEl = document.createElement('div');
    healthEl.className = 'enemy-health';
    const healthBar = document.createElement('div');
    healthBar.className = 'enemy-health-bar';
    // Color bar by type
    if (typeLvl === 1) healthBar.style.background = 'linear-gradient(90deg, #ff8800, #ffcc00)';
    if (typeLvl === 2) healthBar.style.background = 'linear-gradient(90deg, #990000, #ff2200)';
    if (typeLvl === 3) healthBar.style.background = 'linear-gradient(90deg, #ff00ff, #ff0000)';
    healthEl.appendChild(healthBar);
    uiContainer.appendChild(healthEl);
    
    enemy.userData = {
        isEnemy: true,
        type: typeLvl,
        health: def.hp,
        maxHealth: def.hp,
        speed: def.speed,
        attackCooldown: Math.random() * def.attackRate, // stagger initial attack
        attackDamage: def.damage,
        attackRate: def.attackRate,
        retreatChance: def.retreatChance,
        ui: healthEl,
        uiBar: healthBar,
        direction: new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize(),
        moveTimer: 1.0 + Math.random() * 2.0, // longer initial delay before switching state
        state: 'idle',
        detectionRange: def.detRange,
        idleTimer: 1.0 + Math.random() * 4.0,
        alertTimer: 0, // plays alert sound once on detection
    };
    
    scene.add(enemy);
    enemies.push(enemy);
}

function getEnemies() {
    return enemies;
}

function checkEnemyCollision(position) {
    if (typeof getLevelWalls === 'function') {
        const walls = getLevelWalls();
        for (let i = 0; i < walls.length; i++) {
            const wall = walls[i];
            const dx = Math.abs(position.x - wall.position.x);
            const dz = Math.abs(position.z - wall.position.z);
            if (dx < 2.2 && dz < 2.2) { 
                return true;
            }
        }
    }
    return false;
}

function updateEnemies(delta) {
    if (gameState !== 'PLAYING') return;

    const playerPos = controls.getObject().position;

    enemies.forEach(enemy => {
        const dist = enemy.position.distanceTo(playerPos);
        const dirToPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position).normalize();
        dirToPlayer.y = 0;

        const ud = enemy.userData;
        
        // ── Idle: wander until player in range ──
        if (ud.state === 'idle') {
            if (dist < ud.detectionRange) {
                ud.state = 'chase';
                ud.moveTimer = 0.3 + Math.random() * 0.5;
                // Alert sound on first detection
                if (ud.alertTimer <= 0) {
                    ud.alertTimer = 30;
                    playSound('enemy_die');
                }
                // Show boss HP bar on first detection
                if (ud.type === 3) {
                    if (typeof updateBossHPBar === 'function') {
                        updateBossHPBar(ud.health, ud.maxHealth);
                    }
                }
            } else {
                ud.idleTimer -= delta;
                if (ud.idleTimer <= 0) {
                    ud.direction.set(Math.random()-0.5, 0, Math.random()-0.5).normalize();
                    ud.idleTimer = 2.5 + Math.random() * 4;
                }
                const oldX = enemy.position.x;
                enemy.position.x += ud.direction.x * 2.5 * delta;
                if (checkEnemyCollision(enemy.position)) { enemy.position.x = oldX; ud.direction.x *= -1; }
                const oldZ = enemy.position.z;
                enemy.position.z += ud.direction.z * 2.5 * delta;
                if (checkEnemyCollision(enemy.position)) { enemy.position.z = oldZ; ud.direction.z *= -1; }
            }
        }
        
        if (ud.alertTimer > 0) ud.alertTimer -= delta;

        // ── Active AI ──
        if (ud.state === 'chase' || ud.state === 'strafe' || ud.state === 'retreat') {

            // Re-evaluate state periodically
            ud.moveTimer -= delta;
            if (ud.moveTimer <= 0) {
                const r = Math.random();
                if (r < (0.55 - ud.retreatChance)) {
                    ud.direction.copy(dirToPlayer);
                    ud.state = 'chase';
                    ud.moveTimer = 0.8 + Math.random() * 1.5;
                } else if (r < 0.85) {
                    // Strafe left or right around the player
                    const cross = new THREE.Vector3(0, 1, 0).cross(dirToPlayer).normalize();
                    if (Math.random() > 0.5) cross.negate();
                    ud.direction.copy(cross);
                    ud.state = 'strafe';
                    ud.moveTimer = 0.6 + Math.random() * 1.2;
                } else {
                    // Brief tactical retreat
                    ud.direction.copy(dirToPlayer).negate();
                    ud.state = 'retreat';
                    ud.moveTimer = 0.4 + Math.random() * 0.8;
                }
            }

            // All active states: always face toward player
            if (ud.state !== 'retreat') {
                // Blend movement direction toward player a bit for chase/strafe
                if (ud.state === 'chase') {
                    ud.direction.lerp(dirToPlayer, 3 * delta).normalize();
                }
            }

            // Movement with wall-sliding
            const effectiveSpeed = ud.state === 'retreat' ? ud.speed * 0.55 :
                                   ud.state === 'strafe'  ? ud.speed * 0.75 : ud.speed;

            if (dist > 2.0 || ud.state !== 'chase') {
                const oldX = enemy.position.x;
                enemy.position.x += ud.direction.x * effectiveSpeed * delta;
                if (checkEnemyCollision(enemy.position)) {
                    enemy.position.x = oldX;
                    // Bounce direction slightly to slide along walls
                    ud.direction.x *= -0.5;
                    ud.direction.z += (Math.random() - 0.5) * 0.8;
                    ud.direction.normalize();
                }

                const oldZ = enemy.position.z;
                enemy.position.z += ud.direction.z * effectiveSpeed * delta;
                if (checkEnemyCollision(enemy.position)) {
                    enemy.position.z = oldZ;
                    ud.direction.z *= -0.5;
                    ud.direction.x += (Math.random() - 0.5) * 0.8;
                    ud.direction.normalize();
                }
            }

            // Melee attack when close enough
            if (dist < 2.5 && ud.attackCooldown <= 0) {
                ud.attackCooldown = ud.attackRate;
                if (typeof takeDamage === 'function') takeDamage(ud.attackDamage);
            }
        }

        if (ud.attackCooldown > 0) ud.attackCooldown -= delta;

        // ── Health Bar UI ──
        if (dist < 35) {
            ud.ui.style.display = 'block';
            const vector = new THREE.Vector3(enemy.position.x, enemy.position.y + 2, enemy.position.z);
            vector.project(camera);
            
            const screenX = (vector.x * .5 + .5) * window.innerWidth;
            const screenY = (vector.y * -.5 + .5) * window.innerHeight;
            
            if (vector.z < 1 && vector.z > 0) {
                ud.ui.style.left = `${screenX}px`;
                ud.ui.style.top = `${screenY}px`;
                const hpPercent = (ud.health / ud.maxHealth) * 100;
                ud.uiBar.style.width = `${hpPercent}%`;
                const scale = Math.max(0.4, Math.min(2.0, 12 / dist));
                ud.ui.style.transform = `translate(-50%, -50%) scale(${scale})`;
            } else {
                ud.ui.style.display = 'none';
            }
        } else {
            ud.ui.style.display = 'none';
        }
    });
}
