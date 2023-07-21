// Create a new Pixi Application
let app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0xFFFFFF,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});


app.stage.sortableChildren = true;
let uiContainer = new PIXI.Container();
let uiMaskContainer = new PIXI.Container();
let gameContainer = new PIXI.Container();
app.stage.addChild(gameContainer);
app.stage.addChild(uiMaskContainer);
app.stage.addChild(uiContainer);

// Add the app view to our HTML document
document.getElementById('game').appendChild(app.view);

// Set up some constants
const TILE_WIDTH = 40;
const TILE_HEIGHT = 30;
const MAP_WIDTH = 60;
const MAP_HEIGHT = 50;
const SPRITESHEET_PATH = 'assets/spritesheets/grotto40x30-cp437.png';
const SCALE_FACTOR = 0.5; // Scaling factor for HiDPI displays
const SPRITE_POSITION = 5; // Position of the sprite (in tiles)
const SPRITESHEET_COLUMNS = 23;
const SPRITESHEET_ROWS = 11;
//console.log('Initializing maps');
let backgroundMap = createEmptyMap();
let floorMap = createEmptyMap();
let objectMap = createEmptyMap();
let wallMap = createEmptyMap();
let uiMaskMap = createEmptyMap();
let uiMap = createEmptyMap();

let engine;
let gameOver = false;
var players = [];
let activeEntities = [];
var messageList;
var inspector;

function createEmptyMap() {
    let map = new Array(MAP_HEIGHT);
    for (let y = 0; y < MAP_HEIGHT; y++) {
        map[y] = new Array(MAP_WIDTH);
        for (let x = 0; x < MAP_WIDTH; x++) {
            map[y][x] = 0;
        }
    }
    return map;
}

let fireFrames = [];
let smokeFrames = [];
// Load the spritesheet using the global PIXI.Loader object
PIXI.Loader.shared
    .add('tiles', SPRITESHEET_PATH)
    .add('fire', 'assets/spritesheets/fire.png')
    .add('smoke', 'assets/spritesheets/smoke.png')
    .load(setup);


PIXI.Loader.shared.onComplete.add(() => {
    for (let i = 0; i < 7; i++) {
        let rect = new PIXI.Rectangle(i * TILE_WIDTH, 0, TILE_WIDTH, TILE_HEIGHT);
        let texture = new PIXI.Texture(PIXI.Loader.shared.resources.fire.texture.baseTexture, rect);
        fireFrames.push(texture);
    }
    for (let i = 0; i < 7; i++) {
        let rect = new PIXI.Rectangle(i * TILE_WIDTH, 0, TILE_WIDTH, TILE_HEIGHT);
        let texture = new PIXI.Texture(PIXI.Loader.shared.resources.smoke.texture.baseTexture, rect);
        smokeFrames.push(texture);
    }
});
console.log(smokeFrames);

const PlayerType = Object.freeze({
    "HUMAN": 0,
    "ANIMAL": 1,
    "GHOST": 2,
    "ROBOT": 3,
    "BIRD": 4,
    "OBELISK": 5,
    "FUNGUS": 6,
    "SKELETON" : 7,
    "VEGETABLE": 8
    
});



class Player {
    constructor(type, x, y, scheduler, engine, messageList, inspector) {
        this.name = "Bivoj";
        this.isDead = false;
        this.type = type;
        this.x = x;
        this.y = y;
        this.prevX = null;
        this.prevY = null;
        this.footprintTile;
        this.headTile;
        this.sprite = {}; 
        this.attemptingFireEntry = false;
        this.fireEntryDirection = null;
        this.headShadowTile = {x: 14, y: 9};
        this.footShadowTile = {x: 8, y: 6};
        this.sprite.shadow = null;
        this.footShadowTile.zIndex = 1.5;
        this.scheduler = scheduler;
        this.engine = engine;
        this.messageList = messageList;
        this.inspector = inspector;
        window.addEventListener('keydown', (event) => {
            this.handleKeydown(event);
        });
        // stats
        this.blood = 100;
        this.isBurning = false;
        this.burningTurns = 0;
        
        
        // You can set the specific footprint and head tiles for each player type here.
        switch(type) {
            case PlayerType.HUMAN:
                this.footprintPosition = {x: 10, y: 5};
                this.headPosition = {x: 1, y: 0};
                break;
            case PlayerType.ANIMAL:
                this.footprintPosition = {x: 10, y: 7}; 
                this.headPosition = {x: 1, y: 0}; 
                break;
            case PlayerType.GHOST:
                this.footprintPosition = {x: 19, y: 7}; 
                this.headPosition = {x: 2, y: 0}; 
                break;
            case PlayerType.ROBOT:
                this.footprintPosition = {x: 10, y: 5}; 
                this.headPosition = {x: 13, y: 7}; 
                break;
            case PlayerType.BIRD:
                this.footprintPosition = {x: 13, y: 7}; 
                this.headPosition = {x: 13, y: 7}; 
                break;
            case PlayerType.OBELISK:
                this.footprintPosition = {x: 6, y: 7}; 
                this.headPosition = {x: 18, y: 8}; 
                break;
            case PlayerType.FUNGUS:
                this.footprintPosition = {x: 17, y: 7}; 
                this.headPosition = {x: 9, y: 8}; 
                break;
            case PlayerType.VEGETABLE:
                this.footprintPosition = {x: 13, y: 7};
                this.headPosition = {x: 6, y: 8};  
                break;
            case PlayerType.SKELETON:
                this.footprintPosition = {x: 8, y: 7};
                this.headPosition = {x: 9, y: 7};  
                break;
            default:
                this.footprintPosition = {x: 10, y: 5};
                this.headPosition = {x: 1, y: 0};
                break;
        }
    }
    static checkLivingPlayers() {
            for (let player of players) {  // Assuming `players` is an array containing all player instances
                if (!player.isDead) {
                    return true;
                }
            }
            return false;
        }
    move(direction) {
        // Store previous position
        console.log('Player is taking turn...');
        
        this.prevX = this.x;
        this.prevY = this.y;
    
        // Convert player's tile position to pixel position
        let newX = this.x * TILE_WIDTH * SCALE_FACTOR;
        let newY = this.y * TILE_HEIGHT * SCALE_FACTOR;
    
        // Calculate direction of movement in pixels
        switch(direction) {
            case 'up':
                newY -= TILE_HEIGHT * SCALE_FACTOR;
                break;
            case 'down':
                newY += TILE_HEIGHT * SCALE_FACTOR;
                break;
            case 'left':
                newX -= TILE_WIDTH * SCALE_FACTOR;
                break;
            case 'right':
                newX += TILE_WIDTH * SCALE_FACTOR;
                break;
        }
    
        // Convert the new pixel position back to tile position for collision checking
        let newTileX = newX / (TILE_WIDTH * SCALE_FACTOR);
        let newTileY = newY / (TILE_HEIGHT * SCALE_FACTOR);
    
        // Check for collisions or going out of bounds
        if (newTileX >= 0 && newTileX < MAP_WIDTH && newTileY >= 0 && newTileY < MAP_HEIGHT) {
            let floorTileValue = floorMap[newTileY][newTileX]?.value;
            let objectTileValue = objectMap[newTileY][newTileX]?.value;
    
            if (floorTileValue === 157 && (!objectTileValue || objectTileValue < 300)) {
                this.x = newTileX;
                this.y = newTileY;
                this.attemptingFireEntry = false;
                this.fireEntryDirection = null;
            } else if (objectTileValue === 300) {
                if (this.attemptingFireEntry && this.fireEntryDirection === direction) {
                    this.x = newTileX;
                    this.y = newTileY;
                    this.isBurning = true;
                    this.burningTurns = 0;
                    this.messageList.addMessage("You stepped into fire!");
                    this.attemptingFireEntry = false;
                    this.fireEntryDirection = null;
                } else {
                    this.attemptingFireEntry = true;
                    this.fireEntryDirection = direction;
                    this.messageList.addMessage("Walk into the fire?");
                }
            } else {
                this.attemptingFireEntry = false;
                this.fireEntryDirection = null;
            }
        }

        //shadow stuff
        
        let headTileY = this.y - 1;
        let isFrontOfWall = floorMap[headTileY]?.[this.x + 1]?.value === 177 && wallMap[headTileY]?.[this.x + 1]?.value !== 131; // check the tile to the right of the head
        this.sprite.shadow.visible = isFrontOfWall;

        if (isFrontOfWall) {
            this.sprite.shadow.x = (this.x + 1) * TILE_WIDTH * SCALE_FACTOR; // position shadow to the right of the head
            this.sprite.shadow.y = headTileY * TILE_HEIGHT * SCALE_FACTOR;
        }

        // Handle visibility and positioning of the foot shadow
        let isBesideFloor = floorMap[this.y]?.[this.x + 1]?.value === 157 || floorMap[this.y]?.[this.x + 1]?.value === 177 && wallMap[headTileY]?.[this.x + 1]?.value !== 131 && objectMap[headTileY]?.[this.x + 1]?.value !== 300; // check the tile to the right of the footprint
        this.sprite.footShadow.visible = isBesideFloor;

        if (isBesideFloor) {
            this.sprite.footShadow.x = (this.x + 1) * TILE_WIDTH * SCALE_FACTOR; // position foot shadow to the right of the footprint
            this.sprite.footShadow.y = this.y * TILE_HEIGHT * SCALE_FACTOR;
        }
    
        // Reset opacity of sprites that were previously occluded
        if (this.prevX !== null && this.prevY !== null) { // Skip on the first move
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    let y = this.prevY + dy;
                    let x = this.prevX + dx;
                    if (wallMap[y]?.[x]?.sprite) {
                        wallMap[y][x].sprite.alpha = 1;
                    }
                    if (uiMap[y]?.[x]?.sprite) {
                        uiMap[y][x].sprite.alpha = 1;
                    }
                }
            }
        }
    
        // Occlude nearby wall and UI sprites
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                let y = this.y + dy;
                let x = this.x + dx;
                if (wallMap[y]?.[x]?.sprite && floorMap[y][x].value === 157) {
                    createFloor(x,y);
                    wallMap[y][x].sprite.alpha = 0.5;
                }
                if (uiMap[y]?.[x]?.sprite) {
                    uiMap[y][x].sprite.alpha = 0.5;
                }
            }
        }
    
        // Update sprite positions
        this.sprite.footprint.x = this.x * TILE_WIDTH * SCALE_FACTOR;
        this.sprite.footprint.y = this.y * TILE_HEIGHT * SCALE_FACTOR;
        this.sprite.overlay.x = this.sprite.footprint.x;
        this.sprite.overlay.y = this.sprite.footprint.y - TILE_HEIGHT * SCALE_FACTOR;


    }
    handleKeydown(event) {
        if (this.isDead) return;  
        if (this.attemptingFireEntry) {
            switch (event.key) {
                case 'ArrowUp':
                    this.move(this.fireEntryDirection === 'up' ? 'up' : null);
                    break;
                case 'ArrowDown':
                    this.move(this.fireEntryDirection === 'down' ? 'down' : null);
                    break;
                case 'ArrowLeft':
                    this.move(this.fireEntryDirection === 'left' ? 'left' : null);
                    break;
                case 'ArrowRight':
                    this.move(this.fireEntryDirection === 'right' ? 'right' : null);
                    break;
                default:
                    return;  // Ignore all other keys
            }
        } else {
            switch (event.key) {
                case 'ArrowUp':
                    this.move('up');
                    break;
                case 'ArrowDown':
                    this.move('down');
                    break;
                case 'ArrowLeft':
                    this.move('left');
                    break;
                case 'ArrowRight':
                    this.move('right');
                    break;
                default:
                    return;  // Ignore all other keys
            }
        }

        // Ensure that we only unlock the engine if it's locked
        if (this.engine._lock) {
            this.engine.unlock();  // After moving, unlock the engine for the next turn
        }
    }
    applyDamageEffects() {
        if (this.isBurning) {
            this.blood -= 20;
            this.burningTurns++;
            this.messageList.addMessage("You are on fire!");
            
            // Increase chance of burning ending after 4 turns, with a guarantee to stop after 6 turns
            if (this.burningTurns > 3 || (this.burningTurns > 3 && Math.random() < 0.5) || this.burningTurns > 5) {
                this.isBurning = false;
                this.messageList.addMessage("You are no longer on fire.");
            }
    
            // Check if player is dead
            if (this.blood < 1) {
                this.messageList.addMessage("You are dead!");
                this.type = PlayerType.SKELETON;
                this.isDead = true;
    
                // Call updateSprite() here to ensure the player sprite is updated to the skeleton sprite.
                this.skeletonize();
            }
        }
    }
    skeletonize() {
        let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
        
        // Use player type to decide on sprites.
        let footprintPosition, headPosition;
        switch(this.type) {
            // Add your other cases here.
            case PlayerType.SKELETON:
                footprintPosition = {x: 8, y: 7};
                headPosition = {x: 9, y: 7}; 
                break;
            default:
                footprintPosition = {x: 10, y: 5};
                headPosition = {x: 1, y: 0};
                break;
        }
        let footprintTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
            footprintPosition.x * TILE_WIDTH, 
            footprintPosition.y * TILE_HEIGHT, 
            TILE_WIDTH, TILE_HEIGHT));
        let overlayTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
            headPosition.x * TILE_WIDTH, 
            headPosition.y * TILE_HEIGHT, 
            TILE_WIDTH, TILE_HEIGHT));
    
        this.sprite.footprint.texture = footprintTexture;
        this.sprite.overlay.texture = overlayTexture;
    };
    printStats() {
        this.inspector.clearMessages();
        this.inspector.addMessage("");
        this.inspector.addMessage( "Name: " + this.name);
        this.inspector.addMessage( "Blood: " + this.blood);
    }
    act() {
        this.engine.lock(); // Lock the engine until we get a valid move
        this.applyDamageEffects();
        checkGameState();
    }
    
}

function createPlayerSprite(player) {
    players.push(player);
    let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
    let footprintTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        player.footprintPosition.x * TILE_WIDTH, 
        player.footprintPosition.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteFootprint = new PIXI.Sprite(footprintTexture);
    spriteFootprint.scale.set(SCALE_FACTOR);
    spriteFootprint.zIndex = 2;

    let overlayTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        player.headPosition.x * TILE_WIDTH, 
        player.headPosition.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteOverlay = new PIXI.Sprite(overlayTexture);
    spriteOverlay.scale.set(SCALE_FACTOR);
    spriteOverlay.zIndex = 1;

    spriteFootprint.x = player.x * TILE_WIDTH * SCALE_FACTOR;
    spriteFootprint.y = player.y * TILE_HEIGHT * SCALE_FACTOR;
    spriteOverlay.x = spriteFootprint.x;
    spriteOverlay.y = spriteFootprint.y - TILE_HEIGHT * SCALE_FACTOR;

    gameContainer.addChild(spriteFootprint);
    gameContainer.addChild(spriteOverlay);
    spriteFootprint.interactive = true;  // Make the footprint sprite respond to interactivity
    spriteFootprint.on('mouseover', () => {
        messageList.hideBox();  
        player.printStats();
        inspector.showBox();  
        inspector.render();  
    });

    spriteOverlay.interactive = true;  
    spriteOverlay.on('mouseover', () => {
        messageList.hideBox();  
        player.printStats();
        inspector.showBox();  
        inspector.render();  
    });
    spriteFootprint.on('mouseout', () => {
        inspector.hideBox();
        messageList.showBox();
    });
    
    spriteOverlay.on('mouseout', () => {
        inspector.hideBox();
        messageList.showBox();
    });
    player.sprite = { footprint: spriteFootprint, overlay: spriteOverlay };
    let shadowTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        player.headShadowTile.x * TILE_WIDTH, 
        player.headShadowTile.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteShadow = new PIXI.Sprite(shadowTexture);
    spriteShadow.scale.set(SCALE_FACTOR);
    spriteShadow.zIndex = 6; // Set zIndex to show it in front of all other tiles
    spriteShadow.visible = false;
    
    let footShadowTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        player.footShadowTile.x * TILE_WIDTH, 
        player.footShadowTile.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteFootShadow = new PIXI.Sprite(footShadowTexture);
    spriteFootShadow.scale.set(SCALE_FACTOR);
    spriteFootShadow.zIndex = 3; // Set zIndex to show it in front of the footprint but behind the shadow
    spriteFootShadow.visible = false;

    gameContainer.addChild(spriteFootShadow);

    player.sprite.footShadow = spriteFootShadow;

    gameContainer.addChild(spriteShadow);
    
    player.sprite.shadow= spriteShadow;

}

const MonsterType = Object.freeze({
    "BASILISK": 0,
    "CHIMERA": 1,
});


const Attacks = {
    FIREBREATH: function(monster, target) {
        target.isBurning = true;
        let fireTilesCount = Math.floor(Math.random() * 4) + 2; // 2 to 5 fire tiles
        let fire1 = new Fire(target.x, target.y, monster.scheduler, '0xFF0000');//one fire directly on the player
        monster.scheduler.add(fire1, true);
        while (fireTilesCount-- > 0) {
            let dx = Math.floor(Math.random() * 7) - 3; // -3 to 3
            let dy = Math.floor(Math.random() * 7) - 3; // -3 to 3
            let newX = target.x + dx;
            let newY = target.y + dy;
            if (newX >= 0 && newY >= 0 && newX < MAP_WIDTH && newY < MAP_HEIGHT && floorMap[newY][newX].value === 157) {
                let fire = new Fire(newX, newY, monster.scheduler, '0xFF0000');
                monster.scheduler.add(fire, true);
            }
        }
        messageList.addMessage("The {0} breathes flames!", [monster.name]);
    },
    // Add other attacks here
}

class Monster {
    constructor(type, x, y, scheduler, engine, messageList) {
        this.name = null;
        console.log("ROAR");
        this.isDead = false;
        this.upright = true;
        this.type = type;
        this.x = x;
        this.y = y;
        this.prevX = null;
        this.prevY = null;
        this.sprite = {}; 
        this.fireproof;
        this.secondShadowTile = {x: 14, y: 9};
        this.firstShadowTile = {x: 8, y: 6};
        this.sprite.shadow = null;
        this.firstShadowTile.zIndex = 1.5;
        this.scheduler = scheduler;
        this.engine = engine;
        this.messageList = messageList;
        this.blood = 100;
        this.isBurning = false;
        this.burningTurns = 0;
        this.speed = 1;
        this.actFrequency = 1;

        this.name = ""; // To be set by a monster-specific code.
        this.description = ""; // To be set by a monster-specific code.

        // An array of attacks a monster can perform. Can be set by a monster-specific code.
        this.attacks = []; 
        this.spriteFlip = {
            firstTile: {x: false, y: false},
            secondTile: {x: false, y: false}
        };
        
        switch(type) {
            case MonsterType.BASILISK:
                this.name = "Basilisk";
                this.upright = true;
                this.firstTilePosition = {x: 10, y: 7};
                this.secondTilePosition = {x: 21, y: 6};
                this.attacks = ["FIREBREATH"];
                this.target = null;
                this.range = 5;
                this.speed = 1; // Number of tiles to move in a turn
                this.actFrequency = 2; // Number of turns to wait between actions
                this.turnsWaited = 0; // Number of turns waited since last action
                this.getTargetsInRange = function() {
                    if (players.length > 0) {
                        for(let obj of players) { 
                            if(obj.isDead === false) {
                                let dx = this.x - obj.x;
                                let dy = this.y - obj.y;
                                let distance = Math.sqrt(dx * dx + dy * dy);
                
                                if(distance <= this.range) { // within range of Basilisk's attack
                                    this.target = obj;
                                    break;
                                }
                            }
                        }
                    } else {
                        this.target = null;
                    }
                } 
                this.canSeeTarget = function(target) {
                    let lineToTarget = line({x: this.x, y: this.y}, {x: target.x, y: target.y});
                    let seen = true;
                    for(let point of lineToTarget) {
                        let x = point.x;
                        let y = point.y;
                        // If there's a wall or any other blocking entity, the monster can't see the target
                        if (floorMap[y][x].value !== 157 || (objectMap[y] && objectMap[y][x])) {
                            seen = false;
                        }
                    }
                    return seen;
                }
                this.getAdjacentTiles = function() {
                    let adjacentTiles = [];
                    for(let dx = -1; dx <= 1; dx++) {
                        for(let dy = -1; dy <= 1; dy++) {
                            if(dx === 0 && dy === 0) continue;
                            let newX = this.x + dx;
                            let newY = this.y + dy;
                            if(newX >= 0 && newY >= 0 && newX < MAP_WIDTH && newY < MAP_HEIGHT && floorMap[newY][newX].value === 157) {
                                adjacentTiles.push({x: newX, y: newY});
                            }
                        }
                    }
                    return adjacentTiles;
                };
                this.moveRandomly = function() {
                    let adjacentTiles = this.getAdjacentTiles();
                    if(adjacentTiles.length > 0) {
                        let randomTile = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)];
                        this.x = randomTile.x;
                        this.y = randomTile.y;
                        this.updateSpritePosition();
                    }
                };
                this.act = function() {
                    console.log("Basilisk's turn");
                    if(!this.target) {
                        this.getTargetsInRange();
                    }
                    if(this.target) {
                        if (this.canSeeTarget(this.target)) {
                            console.log("The Basilisk sees something!");
                            for (let attackKey of this.attacks) {
                                Attacks[attackKey](this, this.target);
                            }
                        }
                        this.target = null;
                    }  else if(this.turnsWaited >= this.actFrequency) {
                        for(let i = 0; i < this.speed; i++) {
                            this.moveRandomly();
                            //console.log("I'd move if I felt like it.")
                            
                        }
                        this.turnsWaited = 0;
                    }
                    else {
                        this.turnsWaited++;
                    }
                }
                break;
            case MonsterType.CHIMERA:
                    this.name = "Chimera";
                    this.upright = Math.random() > 0.5;
                    this.firstTilePosition = {
                        x: Math.floor(Math.random() * 23), 
                        y: Math.floor(Math.random() * 11)
                    };
                    this.secondTilePosition = {
                        x: Math.floor(Math.random() * 23), 
                        y: Math.floor(Math.random() * 11)
                    };
                    
                    this.spriteFlip = {
                        firstTile: {
                            x: Math.random() > 0.5, 
                            y: Math.random() > 0.5
                        }, 
                        secondTile: {
                            x: Math.random() > 0.5, 
                            y: Math.random() > 0.5
                        }
                    };
                    break;
            default:
                this.name = monster;
                this.upright = true;
                this.footprintPosition = {x: 10, y: 5};
                this.headPosition = {x: 1, y: 0};
                break;
        }
        this.updateSpritePosition = function() {
            if (this.sprite.firstTile && this.sprite.secondTile) {
                this.sprite.firstTile.x = this.x * TILE_WIDTH * SCALE_FACTOR;
                this.sprite.firstTile.y = this.y * TILE_HEIGHT * SCALE_FACTOR;
        
                if (this.upright) {
                    this.sprite.secondTile.x = this.sprite.firstTile.x;
                    this.sprite.secondTile.y = this.sprite.firstTile.y - TILE_HEIGHT * SCALE_FACTOR;
                } else {
                    this.sprite.secondTile.x = this.sprite.firstTile.x + TILE_WIDTH * SCALE_FACTOR;
                    this.sprite.secondTile.y = this.sprite.firstTile.y;
                }
        
                if(this.sprite.firstShadow && this.sprite.secondShadow){
                    this.sprite.firstShadow.x = this.sprite.firstTile.x;
                    this.sprite.firstShadow.y = this.sprite.firstTile.y;
        
                    this.sprite.secondShadow.x = this.sprite.secondTile.x;
                    this.sprite.secondShadow.y = this.sprite.secondTile.y;
                }
            }
        }
        
        
    }
}

function createMonsterSprite(monster) {
    activeEntities.push(this);
    let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
    let firstTileTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        monster.firstTilePosition.x * TILE_WIDTH, 
        monster.firstTilePosition.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteFirstTile = new PIXI.Sprite(firstTileTexture);
    spriteFirstTile.scale.set(SCALE_FACTOR);
    spriteFirstTile.zIndex = 2;

    let secondTileTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        monster.secondTilePosition.x * TILE_WIDTH, 
        monster.secondTilePosition.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteSecondTile = new PIXI.Sprite(secondTileTexture);
    spriteSecondTile.scale.set(SCALE_FACTOR);
    spriteSecondTile.zIndex = 1;

    spriteFirstTile.x = monster.x * TILE_WIDTH * SCALE_FACTOR;
    spriteFirstTile.y = monster.y * TILE_HEIGHT * SCALE_FACTOR;
    if (monster.spriteFlip.firstTile.x) {
        spriteFirstTile.scale.x *= -1; // Flip horizontally
        spriteFirstTile.x += TILE_WIDTH * SCALE_FACTOR;
    }
    if (monster.spriteFlip.firstTile.y) {
        spriteFirstTile.scale.y *= -1; // Flip vertically
        spriteFirstTile.y += TILE_HEIGHT * SCALE_FACTOR;
    }
    if (monster.spriteFlip.secondTile.x) {
        spriteSecondTile.scale.x *= -1; // Flip horizontally
        spriteSecondTile.x += TILE_WIDTH * SCALE_FACTOR;
    }
    if (monster.spriteFlip.secondTile.y) {
        spriteSecondTile.scale.y *= -1; // Flip vertically
        spriteSecondTile.y += TILE_HEIGHT * SCALE_FACTOR;
    }
    if (monster.upright) {
        spriteSecondTile.x = spriteFirstTile.x;
        spriteSecondTile.y = spriteFirstTile.y - TILE_HEIGHT * SCALE_FACTOR;
    } else {
        spriteSecondTile.x = spriteFirstTile.x + TILE_WIDTH * SCALE_FACTOR;
        spriteSecondTile.y = spriteFirstTile.y;
    }
    if (monster.spriteFlip.firstTile.x) {
        spriteFirstTile.scale.x *= -1; // Flip horizontally
    }
    if (monster.spriteFlip.firstTile.y) {
        spriteFirstTile.scale.y *= -1; // Flip vertically
    }
    if (monster.spriteFlip.secondTile.x) {
        spriteSecondTile.scale.x *= -1; // Flip horizontally
    }
    if (monster.spriteFlip.secondTile.y) {
        spriteSecondTile.scale.y *= -1; // Flip vertically
    }
    gameContainer.addChild(spriteFirstTile);
    gameContainer.addChild(spriteSecondTile);

    monster.sprite = { firstTile: spriteFirstTile, secondTile: spriteSecondTile };
    let firstShadowTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        monster.firstShadowTile.x * TILE_WIDTH, 
        monster.firstShadowTile.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteFirstShadow = new PIXI.Sprite(firstShadowTexture);
    spriteFirstShadow.scale.set(SCALE_FACTOR);
    spriteFirstShadow.zIndex = 6; // Set zIndex to show it in front of all other tiles
    spriteFirstShadow.visible = false;

    let secondShadowTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        monster.secondShadowTile.x * TILE_WIDTH, 
        monster.secondShadowTile.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteSecondShadow = new PIXI.Sprite(secondShadowTexture);
    spriteSecondShadow.scale.set(SCALE_FACTOR);
    spriteSecondShadow.zIndex = 3; // Set zIndex to show it in front of the footprint but behind the wall
    spriteSecondShadow.visible = false;

    gameContainer.addChild(spriteFirstShadow);
    gameContainer.addChild(spriteSecondShadow);

    monster.sprite.firstShadow = spriteFirstShadow;
    monster.sprite.secondShadow = spriteSecondShadow;
    
}

function generateColorVariation(color, variation) {
    let baseColor = parseInt(color.slice(2), 16); // Convert to base 16 integer
    let maxColor = 0xFFAA33;
    let minColor = 0x333333;

    // Compute the color variations
    let lighterColor = Math.min(baseColor + variation, maxColor);
    let darkerColor = Math.max(baseColor - variation, minColor);

    // Convert back to hexadecimal color strings
    lighterColor = lighterColor.toString(16).padStart(6, '0');
    darkerColor = darkerColor.toString(16).padStart(6, '0');

    return {
        lighter: '0x' + lighterColor,
        darker: '0x' + darkerColor
    };
}

class Fire {
    constructor(x, y, scheduler, color='0xFFA500') {
        activeEntities.push(this);
        this.x = x;
        this.y = y;
        this.scheduler = scheduler;
        this.turnsLeft = 5; // maximum number of turns this fire can create more fires
        this.color = color;
        this.sprite = new PIXI.AnimatedSprite(fireFrames);
        this.sprite.animationSpeed = 0.1;
        this.sprite.loop = true;
        this.sprite.play();
        this.sprite.position.set(x * TILE_WIDTH * SCALE_FACTOR, y * TILE_HEIGHT * SCALE_FACTOR);  // Adjust position with SCALE_FACTOR
        this.sprite.scale.set(SCALE_FACTOR);  // Adjust scale with SCALE_FACTOR
        this.sprite.zIndex = 2;
        this.sprite.tint = this.color;  // apply the tint
        this.sprite.blendMode = PIXI.BLEND_MODES.MULTIPLY;
        gameContainer.addChild(this.sprite);
        
        if (!objectMap[this.y]) {
            objectMap[this.y] = [];
        }
        objectMap[this.y][this.x] = { value: 300, sprite: this.sprite };

        let colorVariation = generateColorVariation(color, 0x101010); // color variation of flicker

        this.tween = new createjs.Tween.get(this.sprite)
            .to({ tint: colorVariation.lighter }, 20) 
            .wait(20)
            .to({ tint: color }, 100)
            .wait(100)
            .to({ tint: colorVariation.darker }, 10)
            .wait(10)
            .call(() => {
                this.tween.gotoAndPlay(0); // Restart the animation from the beginning
            });
    }

    act() {
        //createjs.Tween.tick();
        // Decrease turns left, if it reaches 0, stop spreading and destroy the sprite
        console.log("fire turn");
        if (--this.turnsLeft <= 0) {
            this.sprite.destroy();
            this.scheduler.remove(this);
            objectMap[this.y][this.x] = null;
            let index = activeEntities.indexOf(this);
            if (index !== -1) {
                activeEntities.splice(index, 1);
            }
            return;

        }
    
        // 30% chance to spread the fire
        if (Math.random() < 0.3) {
            let directions = [
                [-1, 0], // left
                [1, 0], // right
                [0, -1], // up
                [0, 1] // down
            ];
            for (let direction of directions) {
                let newX = this.x + direction[0];
                let newY = this.y + direction[1];
                // Check if the new spot is valid and not already on fire
                if (newX >= 0 && newY >= 0 && newX < MAP_WIDTH && newY < MAP_HEIGHT && 
                    floorMap[newY][newX].value === 157 && 
                    (!objectMap[newY][newX] || objectMap[newY][newX].value !== 300)) {
                
                    let fire = new Fire(newX, newY, this.scheduler, '0xFFCC33');
                    objectMap[newY][newX].value = 300;
                                    
                    if (direction[0] !== 0) { // If the fire spread to the left or right, flip the sprite horizontally
                        // Set the transformation origin to the center of the sprite
                        fire.sprite.anchor.set(0.5, 0.5);
                
                        // Flip horizontally
                        fire.sprite.scale.x *= -1;
                
                        // Adjust sprite's position due to anchor change
                        fire.sprite.x += TILE_WIDTH * SCALE_FACTOR / 2;
                        fire.sprite.y += TILE_HEIGHT * SCALE_FACTOR / 2;
                    }
                                    
                    this.scheduler.add(fire, true); 
                    break;
                }
            }
        }
        if (Math.random() < 0.7) {
            let newY = this.y - 1; // the tile above the current one
            if (newY >= 0 && floorMap[newY][this.x].value !== 177 && objectMap[newY][this.x] === null) {
                let smoke = new Smoke(this.x, newY, this.scheduler);
                this.scheduler.add(smoke, true);
            }
        }
    }
    
    
    
}

class Smoke {
    constructor(x, y, scheduler) {
        //console.log("Creating smoke")
        activeEntities.push(this);
        this.x = x;
        this.y = y;
        this.scheduler = scheduler;
        
        this.sprite = new PIXI.AnimatedSprite(smokeFrames); // Replace fireFrames with smokeFrames
        this.sprite.animationSpeed = 0.1;
        this.sprite.loop = true;
        this.sprite.play();
        this.sprite.position.set(x * TILE_WIDTH * SCALE_FACTOR, y * TILE_HEIGHT * SCALE_FACTOR); 
        this.sprite.scale.set(SCALE_FACTOR); 
        this.sprite.zIndex = 2.5;  // Making sure smoke appears below fire, adjust as needed
        gameContainer.addChild(this.sprite);
        objectMap[this.y][this.x] = 400;
    }

    act() {
        // 50% chance to disappear
        if (Math.random() < 0.5) {
            
            // Remove from object map
            objectMap[this.y][this.x] = null;

            // Destroy sprite and remove from scheduler
            this.sprite.destroy();
            this.scheduler.remove(this);
            let index = activeEntities.indexOf(this);
            if (index !== -1) {
                activeEntities.splice(index, 1);
            }

        }
        checkGameState();
    }
}


// This function advances the turn after a delay of 1 second
function delayedAdvanceTurn() {
    setTimeout(function() {
        engine.unlock();
        
    }, 1000);
}

// This function checks the state of the game and takes appropriate action
function checkGameState() {
    var alivePlayers = players.filter(function(player) {
        return !player.isDead;
    });
    if (alivePlayers.length === 0) {
        let isSomeoneCanAct = activeEntities.some(entity => typeof entity.act === 'function');
        // If no one can act, and game over flag is not set yet, show the message and stop the game
        if (!isSomeoneCanAct && !gameOver) {
            messageList.addMessage("The dungeon is still");
            engine.lock();
            gameOver = true; // Set game over flag to true
        }
        // Otherwise, advance the turn after a delay of 1 second and show "Time passes..." message
        else if (isSomeoneCanAct) {
            messageList.addMessage("Time passes...");
            delayedAdvanceTurn();
        }
    }
}

function createSprite(x, y, position, layer, value = null) {
    if (!layer[y]) {
        layer[y] = [];
    }
    let container;
    if (layer === uiMaskMap){
        container = uiMaskContainer;
    } else if (layer === uiMap) {
        container = uiContainer;
    } else {
        container = gameContainer;
    }
    // If a sprite already exists at this position, remove it from the stage
    if (layer?.[y]?.[x]?.sprite) {
        container.removeChild(layer[y][x].sprite);
    }

    

    let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
    let texture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        position.x * TILE_WIDTH,
        position.y * TILE_HEIGHT,
        TILE_WIDTH, TILE_HEIGHT));

    let sprite = new PIXI.Sprite(texture);
    sprite.scale.set(SCALE_FACTOR);
    sprite.x = x * TILE_WIDTH * SCALE_FACTOR;
    sprite.y = y * TILE_HEIGHT * SCALE_FACTOR;

    // Set initial opacity to 1
    if (layer === wallMap || layer === uiMap) {
        sprite.alpha = 1;
    }
    if (layer === uiMap) {
        sprite.zIndex = 10;
        
        // Remove sprites on all layers beneath the UI layer if they exist at the same position
        if (wallMap?.[y]?.[x]?.sprite) {
            container.removeChild(wallMap[y][x].sprite);
            wallMap[y][x].sprite = null;
        }
        if (objectMap?.[y]?.[x]?.sprite) {
            container.removeChild(objectMap[y][x].sprite);
            objectMap[y][x].sprite = null;
        }
        if (floorMap?.[y]?.[x]?.sprite) {
            container.removeChild(floorMap[y][x].sprite);
            floorMap[y][x].sprite = null;
        }
        if (backgroundMap?.[y]?.[x]?.sprite) {
            container.removeChild(backgroundMap[y][x].sprite);
            backgroundMap[y][x].sprite = null;
        }
    } else if (layer === wallMap) {
        sprite.zIndex = 3;

        // Remove sprites on layers beneath the wall layer if they exist at the same position
        if (floorMap?.[y]?.[x]?.sprite) {
            container.removeChild(floorMap[y][x].sprite);
            floorMap[y][x].sprite = null;
        }
        if (backgroundMap?.[y]?.[x]?.sprite) {
            container.removeChild(backgroundMap[y][x].sprite);
            backgroundMap[y][x].sprite = null;
        }
    } else if (layer === objectMap) {
        sprite.zIndex = 2; // Set zIndex for objectMap
    } else if (layer === floorMap) {
        sprite.zIndex = 1;
        
        // Remove sprites on the background layer if they exist at the same position
        if (backgroundMap?.[y]?.[x]?.sprite) {
            container.removeChild(backgroundMap[y][x].sprite);
            backgroundMap[y][x].sprite = null;
        }
    }

    container.addChild(sprite);

    let existingValue = layer[y][x] ? layer[y][x].value : null;
    layer[y][x] = {value: value !== null ? value : existingValue, sprite: sprite};

    // Update zIndex for objectMap based on y position compared to walls
    if (layer === objectMap && wallMap?.[y]?.[x]?.sprite) {
        if (y * TILE_HEIGHT * SCALE_FACTOR < wallMap[y][x].sprite.y) {
            sprite.zIndex = 4; // Object is behind the wall
        }
    }
}






function createVoid(x, y) {
    createSprite(x, y, {x: 9, y: 9}, backgroundMap, 216);

    let sprite = backgroundMap[y][x].sprite;

    // Set the transformation origin to the center of the sprite
    sprite.anchor.set(0.5, 0.5);

    // Randomly flip the sprite horizontally or vertically
    let randomFlip = Math.random(); // Generates a random number between 0 (inclusive) and 1 (exclusive)
    if (randomFlip < 0.25) {
        sprite.scale.x *= -1; // Flip horizontally
    } else if (randomFlip < 0.5) {
        sprite.scale.y *= -1; // Flip vertically
    }

    // Adjust sprite's position due to anchor change
    sprite.x = x * TILE_WIDTH * SCALE_FACTOR + TILE_WIDTH * SCALE_FACTOR / 2;
    sprite.y = y * TILE_HEIGHT * SCALE_FACTOR + TILE_HEIGHT * SCALE_FACTOR / 2;
}


function createFloor(x, y) {
    createSprite(x, y, {x: 19, y: 6}, floorMap, 157);
}

function createWall(x, y) {
    createSprite(x, y, {x: 16, y: 7}, floorMap, 177); // footprint
    createSprite(x, y - 1, {x: 16, y: 7}, wallMap, 177); // middle
    createSprite(x, y - 2, {x: 16, y: 5}, wallMap, 131); // top
}
function createVerticalWall(x, y) {
    if (wallMap[y][x] !== 131 && wallMap[y][x] !== 177){
        createSprite(x, y, {x: 16, y: 5}, floorMap, 177); // footprint
        createSprite(x, y - 1, {x: 16, y: 5}, wallMap, 177); // middle
    }
    createSprite(x, y - 2, {x: 16, y: 5}, wallMap, 131); // top
}


// dungeon generator
function dungeonGeneration() {
    // Use rot.js to create a uniform dungeon map
    const dungeon = new ROT.Map.Uniform(MAP_WIDTH, MAP_HEIGHT);

    // This callback function will be executed for every generated map cell
    const callback = (x, y, value) => {
        if (value === 0) {
            // 0 represents a floor tile
            floorMap[y][x] = 157; // 157 is the floor tile representation in the game
        } else {
            // 1 represents a wall or void
            backgroundMap[y][x] = 216; // 216 is the void tile representation in the game
        }
    };
    
    dungeon.create(callback);
}

function addFloorsAndVoid() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (floorMap[y][x] === 157) {
                createFloor(x, y);
            } else if (backgroundMap[y][x] === 216) {
                createVoid(x, y);
            }
        }
    }
}

function isAdjacentTo(map, x, y, tileValue) {
    const isAbove = y > 1 && map[y - 1][x].value === tileValue; // Check Up
    const isBelow = y < MAP_HEIGHT - 1 && map[y + 1][x].value === tileValue; // Check Down
    const isLeft = x > 1 && map[y][x - 1].value === tileValue; // Check Left
    const isRight = x < MAP_WIDTH - 1 && map[y][x + 1].value === tileValue; // Check Right

    return isAbove || isBelow || isLeft || isRight;
}

function isAbove(map, x, y, tileValue) {
    return y > 0 && map[y - 1][x].value === tileValue;
}

function isTwoAbove(map, x, y, tileValue) {
    return y > 1 && map[y - 2][x].value === tileValue;
}

function isThreeAbove(map, x, y, tileValue) {
    return y > 3 && map[y - 3][x].value === tileValue;
}

function isBelow(map, x, y, tileValue) {
    return y < MAP_HEIGHT - 1 && map[y + 1][x].value === tileValue;
}


function hasVerticalTilesOnSide(map, x, y, tileValue, isLeftSide) {
    let hasVerticalTiles;
    
    if (isLeftSide) {
        hasVerticalTiles = x > 0 &&
            (y > 0 && map[y - 1][x - 1].value === tileValue) && // Top Left
            (map[y][x - 1].value === tileValue) && // Middle Left
            (y < MAP_HEIGHT - 1 && map[y + 1][x - 1].value === tileValue); // Lower Left
    } else {
        hasVerticalTiles = x < MAP_WIDTH - 1 &&
            (y > 0 && map[y - 1][x + 1].value === tileValue) && // Top Right
            (map[y][x + 1].value === tileValue) && // Middle Right
            (y < MAP_HEIGHT - 1 && map[y + 1][x + 1].value === tileValue); // Lower Right
    }

    // Log the values for debugging purposes
    //console.log(`Checking vertical tiles at (${x}, ${y}), isLeftSide: ${isLeftSide}, hasVerticalTiles: ${hasVerticalTiles}`);
    
    return hasVerticalTiles;
}

function isOnLeft(map, x, y, tileValue) {
    return x > 0 && map[y][x - 1].value === tileValue;
}

function behindShadowEdge(map, x, y) {
    return x > 1 && map[y][x - 2].value === 127;
}

function isOnRight(map, x, y, tileValue) {
    return x < MAP_WIDTH - 1 && map[y][x + 1].value === tileValue;
}

function isInMidAndLowerRight(map, x, y, tileValue) {
    const isUpperRight = x < MAP_WIDTH - 1 && y > 1 && map[y - 1][x + 1].value === tileValue;
    const isMidRight = x < MAP_WIDTH - 1 && map[y][x + 1].value === tileValue;
    const isLowerRight = x < MAP_WIDTH - 1 && y < MAP_HEIGHT - 1 && map[y + 1][x + 1].value === tileValue;

    return isMidRight && isLowerRight && isUpperRight;
}

function isInMidAndLowerLeft(map, x, y, tileValue) {
    const isUpperLeft = x > 0 && y > 1 && map[y - 1][x - 1].value === tileValue;
    const isMidLeft = x > 0 && map[y][x - 1].value === tileValue;
    const isLowerLeft = x > 0 && y < MAP_HEIGHT - 1 && map[y + 1][x - 1].value === tileValue;

    return !isUpperLeft && isMidLeft && isLowerLeft;
}

function isOnlyUpperLeftCornerTile(map, x, y, tileValue) {
    const UpperLeft = x > 0 && y > 1 && map[y - 1][x - 1].value === tileValue;
    const left = x > 0 && map[y][x - 1].value === tileValue;
    const below = y < MAP_HEIGHT - 1 && map[y + 1][x].value === tileValue;
    const right = x < MAP_WIDTH - 1 && map[y][x + 1].value === tileValue;

    return left && UpperLeft && !below && !right;
}

function isUpperLeftCornerTile(map, x, y, tileValue) {
    // Check if y - 1 is within bounds
    if (y > 0) {
        // Check if x - 1 is within bounds, and map[y - 1][x - 1] exists with a 'value' property
        const isUpperLeft = x > 0 && y > 1 && map[y - 1][x - 1].value === tileValue;
        return isUpperLeft;
    }
    return false;
}

function isUpperRightCornerTile(map, x, y, tileValue) {
    // Check if y - 1 is within bounds
    if (y > 0) {
        // Check if x - 1 is within bounds, and map[y - 1][x + 1] exists with a 'value' property
        const isUpperRight = x < MAP_WIDTH - 1 && y > 1 && map[y - 1][x + 1].value === tileValue;
        return isUpperRight;
    }
    return false;
}


function isLowerLeftCornerTile(map, x, y, tileValue) {
    // Check if y + 1 is within bounds
    if (y < map.length - 1) {
        // Check if x - 1 is within bounds
        const isLowerLeft = x > 0 && y < MAP_HEIGHT - 1 && map[y + 1][x - 1].value === tileValue;
        return isLowerLeft;
    }
    return false;
}


function isLowerRightCornerTile(map, x, y, tileValue) {
    // Check if y + 1 is within bounds
    if (y < map.length - 1) {
        // Check if x + 1 is within bounds
        const isLowerRight = x < MAP_WIDTH - 1 && y < MAP_HEIGHT - 1 && map[y + 1][x + 1].value === tileValue;
        return isLowerRight;
    }
    return false;
}

function diagonal_distance(p0, p1) {
    return Math.max(Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y));
}

function round_point(p) {
    return { x: Math.round(p.x), y: Math.round(p.y) };
}

function lerp_point(p0, p1, t) {
    return {
        x: p0.x * (1 - t) + p1.x * t,
        y: p0.y * (1 - t) + p1.y * t
    };
}

function line(p0, p1) {
    let points = [];
    let N = diagonal_distance(p0, p1);
    for (let step = 0; step <= N; step++) {
        let t = N === 0? 0.0 : step / N;
        points.push(round_point(lerp_point(p0, p1, t)));
    }
    return points;
}

function addBaseAndShadows() {
    console.log("adding shadows");
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            // Check if the current tile is a floor
            if (backgroundMap[y][x].value === 216 && floorMap[y][x].value !== 177 && wallMap[y][x].value !== 177 && wallMap[y][x].value !== 131) { 
                if (!isUpperLeftCornerTile(floorMap, x,y,177) && isAbove(floorMap, x, y, 177) ) {
                    createSprite(x,y,{x: 12, y: 5},backgroundMap, 127);
                }
                if ((isOnLeft(wallMap, x,y,177) || isOnLeft(wallMap, x,y,131) || isOnLeft(floorMap, x,y,177)) && isAbove(floorMap, x, y, 177) ) {
                    createSprite(x,y,{x: 12, y: 5},backgroundMap, 127);
                }
                if ((isUpperLeftCornerTile(backgroundMap,x,y,127) && isAbove(backgroundMap,x,y,177))){
                    createSprite(x,y,{x: 12, y: 5},backgroundMap, 127);
                }

                if ((isOnLeft(backgroundMap,x,y,127)) && wallMap[y][x].value !== 177 && floorMap[y][x].value !== 177  && (isAbove(floorMap,x,y,177) || isAbove(backgroundMap,x,y,177))){
                    let xPos = x; // Start checking from the tile to the right of the current tile
                    while (y > 1 && xPos < MAP_WIDTH -1 && floorMap[y][xPos].value !== 177 && wallMap[y][xPos].value !== 177 && wallMap[y][xPos].value !== 131 && backgroundMap[y][xPos].value === 216 && (isAbove(floorMap,xPos,y,177) || isAbove(backgroundMap,xPos,y,177))) {
                        createSprite(xPos, y, {x: 16, y: 7},backgroundMap, 177);
                        xPos++; // Move to the next tile to the right
                    }
                }
            }
            
        }
    }
}

function evaluateMapAndCreateWalls() {
    // Loop through each row
    for (let y = 0; y < MAP_HEIGHT; y++) {
        // Loop through each column
        for (let x = 0; x < MAP_WIDTH; x++) {
            // Check if the current tile has a value of 216
            if (backgroundMap[y][x].value === 216) {
                //console.log("I found a void at (" + x + ", " + y + ")");

                // First, check for vertical walls
                // Check if adjacent to floor
                let isAdjacentToFloorAbove = isAbove(floorMap, x, y, 157);
                
                let isAdjacentToFloor =
                    isAdjacentToFloorAbove ||
                    isBelow(floorMap, x, y, 157) ||
                    isOnLeft(floorMap, x, y, 157) ||
                    isOnRight(floorMap, x, y, 157);

                if (isAdjacentToFloor) {
                    if (isAdjacentToFloorAbove) {
                        createWall(x, y);
                    } else {
                        createWall(x, y);
                    }
                } else if (isLowerLeftCornerTile(floorMap, x, y, 157) || isLowerRightCornerTile(floorMap, x, y, 157) || isUpperLeftCornerTile(floorMap, x, y, 157) || isUpperRightCornerTile(floorMap, x, y, 157)){
                    createWall(x, y);
                    //console.log("Void at (" + x + ", " + y + ") is NOT adjacent to a floor");
                }
            }
        }
    }
}

/// UI functions


// a class for screen text
class UIBox {
    constructor(textBuffer = [""], width = MAP_WIDTH, height = null, hidden = false) {
        this.textBuffer = textBuffer;
        this.width = width;
        this.height = height || textBuffer.length;
        this.hidden = hidden;
        this.height = Math.min(this.height, MAP_HEIGHT);
        this.originalTiles = [];
    }
     // Clears the message box
    maskBox() {
        const WHITE_TILE = { x: 21, y: 7 };
        for(let y = 0; y < this.height +1; y++) {
            for(let x = 0; x < this.width; x++) {
                createSprite(x, y, WHITE_TILE, uiMaskMap, 0);
            }
        }
    }

    clearBox(){
        const BLANK_TILE = { x: 0, y: 0 };
        for(let y = 0; y < this.height+1; y++) {
            for(let x = 0; x < this.width; x++) {
                createSprite(x, y, BLANK_TILE, uiMap, 0);
                createSprite(x, y, BLANK_TILE, uiMaskMap, 0);
            }
        }
    }
    // a function to draw a box with sprites
    drawUIBox() {
        if (this.hidden) return; // If box is hidden, don't draw it
        const BORDER_TOP_LEFT = { x: 8, y: 9 }; 
        const BORDER_HORIZONTAL = { x: 11, y: 8 }; 
        const BORDER_VERTICAL = { x: 17, y: 7 }; 
        const BORDER_TOP_RIGHT = { x: 6, y: 8 }; 
        const BORDER_BOTTOM_LEFT = { x: 5, y: 1 };
        const BORDER_BOTTOM_RIGHT = { x: 7, y: 9 }; 
        const WHITE_TILE = { x: 21, y: 7};

        // Adjust box height based on number of lines in textBuffer, but not more than MAP_HEIGHT
        if (this.height == null){this.height = Math.min(this.textBuffer.length, MAP_HEIGHT );}
        if (this.width == null){this.width = MAP_WIDTH};

        this.maskBox();
        createSprite(0, 0, BORDER_TOP_LEFT,uiMap, 214);
        for (let x = 1; x < this.width - 1; x++) {
            createSprite(x, 0, BORDER_HORIZONTAL,uiMap, 196);
        }
        createSprite(this.width - 1, 0, BORDER_TOP_RIGHT,uiMap, 191);

        for (let y = 1; y < this.height; y++) {
            createSprite(0, y, BORDER_VERTICAL, uiMap, 179);
            createSprite(this.width - 1, y, BORDER_VERTICAL, uiMap, 179);
            /* for(let x = 1; x < this.width - 1; x++) {
                createSprite(x, y, WHITE_TILE, uiMap, 0);
            } */
            // Write the message
            let message = this.textBuffer[y - 1]; // get the message from the buffer
            if (message) {
                for (let i = 0; i < message.length; i++) {
                    let spriteLocation = this.charToSpriteLocation(message.charAt(i));
                    createSprite(i + 1, y, spriteLocation, uiMap, message.charCodeAt(i));
                }
            }

            // Draw the bottom border of the box if it's the last line in the textBuffer, this was because the  box bottom was missing sometimes
            if (y === this.height - 1) {
                createSprite(0, y + 1, BORDER_BOTTOM_LEFT, uiMap, 192);
                for (let x = 1; x < this.width - 1; x++) {
                    createSprite(x, y + 1, BORDER_HORIZONTAL, uiMap, 196);
                }
                createSprite(this.width - 1, y + 1, BORDER_BOTTOM_RIGHT, uiMap, 217);
            }
        }
    }

    charToSpriteLocation(char) {
        let charCode = char.charCodeAt(0);
        let tileNumber = charCode; 
        let spriteColumn = tileNumber % SPRITESHEET_COLUMNS;
        let spriteRow = Math.floor(tileNumber / SPRITESHEET_COLUMNS);
        
        if(spriteColumn >= SPRITESHEET_COLUMNS) {
            spriteColumn = 0;
            spriteRow++;
        }

        //console.log(`Character ${char}, sprite coordinates: ${spriteColumn}, ${spriteRow}`);
        return { x: spriteColumn, y: spriteRow };
    }

    // Adds a message to the list
    addMessage(template, parameters = []) {
        let message = template;
        for(let i = 0; i < parameters.length; i++) {
            message = message.replace(`{${i}}`, parameters[i]);
        }
        this.textBuffer.push(message);
        this.render();
    }

    clearMessages(){
        this.textBuffer = [];
    }

    clearText(){
        const BLANK_TILE = { x: 0, y: 0 };
        for(let y = 1; y < this.height - 1; y++) {
            for(let x = 1; x < this.width - 1; x++) {
                createSprite(x, y, BLANK_TILE, uiMap, 0);
            }
        }
    }
    
    // Toggles the active state
    toggleActive() {
        this.active = !this.active;
    }

    toggleVisibility() {
        this.hidden = !this.hidden;
    }

    showBox() {
        this.hidden = false;
        this.drawUIBox();
    }

    hideBox() {
        this.hidden = true;
        this.clearBox();
    }

    render() {
        this.drawUIBox();
        if (!this.hidden && this.textBuffer.length > 0) {
            this.clearText();
            this.maskBox();
            const lastMessages = this.textBuffer.slice(-2);
            for(let i = 0; i < lastMessages.length; i++) {
                let message = lastMessages[i];
                let y = 2 + i;
                for(let j = 0; j < message.length; j++) {
                    let spriteLocation = this.charToSpriteLocation(message.charAt(j));
                    createSprite(j + 1, y, spriteLocation, uiMap, message.charCodeAt(j));
                }
            }
            if (this.textBuffer.length > 2) {
                this.textBuffer.shift();
            }
        }
    }
}
// This function will run when the spritesheet has finished loading
function setup() {
    dungeonGeneration();
    addFloorsAndVoid();
    evaluateMapAndCreateWalls(floorMap);
    addBaseAndShadows();


    let walkableTiles = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (floorMap[y][x].value === 157) {
                walkableTiles.push({x: x, y: y});
            }
        }
    }

    let randomTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];

    let randomTile2 = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];

    let randomTile3 = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
    messageList = new UIBox(["Welcome to the Dungeon of Doom!"], MAP_WIDTH, 5);
    inspector = new UIBox([], 20, 10, true);

    // And handle them individually
    messageList.showBox();

    PIXI.Loader.shared.onComplete.add(() => {
        for (let i = 0; i < 7; i++) { // assuming you have 4 frames of fire animation
            let rect = new PIXI.Rectangle(i * TILE_WIDTH, 0, TILE_WIDTH, TILE_HEIGHT);
            let texture = new PIXI.Texture(PIXI.Loader.shared.resources.fire.texture.baseTexture, rect);
            fireFrames.push(texture);
        }

        let scheduler = new ROT.Scheduler.Simple();
        engine = new ROT.Engine(scheduler);
        let player = new Player(PlayerType.HUMAN, randomTile.x, randomTile.y, scheduler, engine, messageList, inspector);
        createPlayerSprite(player);
        scheduler.add(player, true); // the player takes turns

        let basilisk = new Monster(MonsterType.BASILISK, randomTile2.x, randomTile2.y, scheduler, engine, messageList);
        createMonsterSprite(basilisk);
        scheduler.add(basilisk, true);

        /* let chimera = new Monster(MonsterType.CHIMERA, randomTile3.x, randomTile3.y, scheduler, engine, messageList);
        createMonsterSprite(chimera);
        scheduler.add(chimera, true); */

        //add some fire
        for (let i = 0; i < 3; i++) {
            let randomTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            let fire = new Fire(randomTile.x, randomTile.y, scheduler, '0xFFCC33');
            scheduler.add(fire, true); // the fire takes turns
        }
 
        engine.start(); // start the engine
    });

}