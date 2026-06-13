// Main Game Initialization and Loop

function init() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // HiDPI support, cap at 2x
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    document.body.appendChild(renderer.domElement);

    // Ambient light — very dim for atmosphere
    const ambientLight = new THREE.AmbientLight(0x202030, 1.8);
    scene.add(ambientLight);

    // Hemisphere light for subtle color variation
    const hemiLight = new THREE.HemisphereLight(0x333355, 0x111100, 0.6);
    scene.add(hemiLight);

    // Player flashlight — SpotLight aimed forward
    const flashlight = new THREE.SpotLight(0xffeedd, 3.5, 60, Math.PI / 6, 0.35, 1.5);
    flashlight.position.set(0, 0, 0);
    flashlight.target.position.set(0, 0, -10);
    camera.add(flashlight);
    camera.add(flashlight.target);
    scene.add(camera); // needed for SpotLight target to work

    // Soft fill around player so immediate walls are always visible
    const playerFill = new THREE.PointLight(0xffffee, 0.5, 8);
    playerFill.position.set(0, 0, 0);
    camera.add(playerFill);

    document.addEventListener('click', (e) => {
        if (gameState === 'PLAYING' && !controls.isLocked) {
            controls.lock();
        }
    });

    controls.addEventListener('lock', function () {
        document.getElementById('weapon-sprite').style.display = 'block';
    });

    controls.addEventListener('unlock', function () {
        document.getElementById('weapon-sprite').style.display = 'none';
        // Only show pause if the player deliberately unlocked during gameplay
        // (not on initial page load or menu state)
        if (gameState === 'PLAYING') {
            gameState = 'PAUSED';
            document.getElementById('pause-menu').style.display = 'flex';
            bgMusic.pause();
        }
    });

    scene.add(controls.getObject());

    window.addEventListener('resize', onWindowResize, false);
    
    // UI Buttons
    document.getElementById('start-btn').addEventListener('click', (e) => { e.stopPropagation(); startGame(); });
    document.getElementById('restart-btn').addEventListener('click', (e) => { e.stopPropagation(); restartLevel(); });
    document.getElementById('next-level-btn').addEventListener('click', (e) => { e.stopPropagation(); nextLevel(); });
    document.getElementById('restart-full-btn').addEventListener('click', (e) => { e.stopPropagation(); startGame(); });

    document.getElementById('resume-btn').addEventListener('click', (e) => { e.stopPropagation(); resumeGame(); });
    document.getElementById('quit-btn').addEventListener('click', (e) => { e.stopPropagation(); quitToMenu(); });
    
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('settings-menu').style.display = 'flex';
    });
    
    document.getElementById('close-settings-btn').addEventListener('click', () => {
        document.getElementById('settings-menu').style.display = 'none';
        document.getElementById('main-menu').style.display = 'flex';
    });
    
    document.getElementById('controls-toggle-btn').addEventListener('click', () => {
        const dd = document.getElementById('controls-dropdown');
        if (dd.style.display === 'none') {
            dd.style.display = 'block';
            document.getElementById('controls-toggle-btn').innerText = 'УПРАВЛЕНИЕ ▲';
        } else {
            dd.style.display = 'none';
            document.getElementById('controls-toggle-btn').innerText = 'УПРАВЛЕНИЕ ▼';
        }
    });
    
    document.getElementById('volume-slider').addEventListener('input', (e) => {
        bgMusic.volume = e.target.value;
        const mainVol = document.getElementById('main-volume-slider');
        if (mainVol) mainVol.value = e.target.value;
    });
    
    const mainVol = document.getElementById('main-volume-slider');
    if (mainVol) {
        mainVol.addEventListener('input', (e) => {
            bgMusic.volume = e.target.value;
            document.getElementById('volume-slider').value = e.target.value;
        });
    }

    if (typeof initPlayer === 'function') initPlayer();

    animate();
}

function resetPlayerStats() {
    playerStats.health = 100;
    playerStats.armor = currentLevel >= 1 ? 25 : 0;
    if (currentLevel >= 3) playerStats.armor = 100;
    
    playerStats.ammo = currentLevel >= 1 ? 20 : 0;
    
    playerStats.hasShotgun = currentLevel >= 1;
    playerStats.hasRifle = currentLevel >= 2;
    playerStats.hasPlasma = currentLevel >= 3;
    
    playerStats.currentWeapon = 0;
    if (playerStats.hasShotgun) { playerStats.currentWeapon = 1; playerStats.ammo += 10; }
    if (playerStats.hasRifle) { playerStats.currentWeapon = 2; playerStats.ammo += 20; }
    if (playerStats.hasPlasma) { playerStats.currentWeapon = 3; playerStats.ammo += 50; }
    
    if (typeof setWeaponSprite === 'function') setWeaponSprite(playerStats.currentWeapon);
    if (typeof updateHUD === 'function') updateHUD();
}

function startGame() {
    // Hide all menus
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('victory').style.display = 'none';
    document.getElementById('final-victory').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    
    gameState = 'PLAYING';
    currentLevel = 0;
    score = 0;
    totalKills = 0;
    
    resetPlayerStats();
    if (typeof loadLevel === 'function') loadLevel(currentLevel);
    
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log("Audio play error:", e));
    
    controls.lock();
}

function restartLevel() {
    document.getElementById('game-over').style.display = 'none';
    gameState = 'PLAYING';
    
    resetPlayerStats();
    if (typeof loadLevel === 'function') loadLevel(currentLevel);
    
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log("Audio play error:", e));
    
    controls.lock();
}

function nextLevel() {
    document.getElementById('victory').style.display = 'none';
    gameState = 'PLAYING';
    
    // Keep weapons and score, refresh health + armor, guarantee minimum ammo
    playerStats.health = playerStats.maxHealth;
    playerStats.armor = Math.max(playerStats.armor, 25); // Never enter next level with 0 armor
    playerStats.ammo = Math.max(playerStats.ammo, 20); // Never enter next level broke
    if (typeof updateHUD === 'function') updateHUD();
    
    if (typeof loadLevel === 'function') loadLevel(currentLevel);
    
    bgMusic.play().catch(e => console.log("Audio play error:", e));
    
    controls.lock();
}

function resumeGame() {
    document.getElementById('pause-menu').style.display = 'none';
    gameState = 'PLAYING';
    bgMusic.play().catch(e => console.log("Audio play error:", e));
    controls.lock();
}

function quitToMenu() {
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
    gameState = 'MENU';
    bgMusic.pause();
    bgMusic.currentTime = 0;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// FPS counter
let _fpsFrames = 0;
let _fpsTime = 0;

function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1);

    // FPS counter update (~2x per second)
    _fpsFrames++;
    _fpsTime += delta;
    if (_fpsTime >= 0.5) {
        const fps = Math.round(_fpsFrames / _fpsTime);
        const el = document.getElementById('fps-counter');
        if (el) el.textContent = `${fps} FPS`;
        _fpsFrames = 0;
        _fpsTime = 0;
    }

    if (gameState === 'PLAYING') {
        if (typeof updatePlayer === 'function') updatePlayer(delta);
        if (typeof updateEnemies === 'function') updateEnemies(delta);
        if (typeof updateWeapons === 'function') updateWeapons(delta);
        if (typeof updateItems === 'function') updateItems(delta);
        if (typeof updateParticles === 'function') updateParticles(delta);
    }

    renderer.render(scene, camera);
}

init();
