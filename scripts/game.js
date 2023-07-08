// Create a new Pixi Application
let app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0xFFFFFF,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});

app.stage.sortableChildren = true;

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
let uiMap = createEmptyMap();


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
    "VEGETABLE": 7
});

class Player {
    constructor(type, x, y, scheduler, engine, messageList) {
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
        window.addEventListener('keydown', (event) => {
            this.handleKeydown(event);
        });
        
        
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
                this.footprintPosition = {x: 6, y: 7}; 
                this.headPosition = {x: 9, y: 8}; 
                break;
            case PlayerType.VEGETABLE:
                this.footprintPosition = {x: 13, y: 7};
                this.headPosition = {x: 6, y: 8};  
                break;
            default:
                this.footprintPosition = {x: 10, y: 5};
                this.headPosition = {x: 1, y: 0};
                break;
        }
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
                    this.attemptingFireEntry = false;
                    this.fireEntryDirection = null;
                } else {
                    this.attemptingFireEntry = true;
                    this.fireEntryDirection = direction;
                    console.log("Walk into the fire?");
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
        let isBesideFloor = floorMap[this.y]?.[this.x + 1]?.value === 157 && wallMap[headTileY]?.[this.x + 1]?.value !== 131 && objectMap[headTileY]?.[this.x + 1]?.value !== 300; // check the tile to the right of the footprint
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

    act() {
        this.engine.lock(); // Lock the engine until we get a valid move
    }
    
}

function createPlayerSprite(player) {
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

    app.stage.addChild(spriteFootprint);
    app.stage.addChild(spriteOverlay);

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

    app.stage.addChild(spriteFootShadow);

    player.sprite.footShadow = spriteFootShadow;

    app.stage.addChild(spriteShadow);
    
    player.sprite.shadow= spriteShadow;

}

class Fire {
    constructor(x, y, scheduler) {
        this.x = x;
        this.y = y;
        this.scheduler = scheduler;
        this.turnsLeft = 5; // maximum number of turns this fire can create more fires

        this.sprite = new PIXI.AnimatedSprite(fireFrames);
        this.sprite.animationSpeed = 0.1;
        this.sprite.loop = true;
        this.sprite.play();
        this.sprite.position.set(x * TILE_WIDTH * SCALE_FACTOR, y * TILE_HEIGHT * SCALE_FACTOR);  // Adjust position with SCALE_FACTOR
        this.sprite.scale.set(SCALE_FACTOR);  // Adjust scale with SCALE_FACTOR
        this.sprite.zIndex = 2;
        app.stage.addChild(this.sprite);

        if (!objectMap[this.y]) {
            objectMap[this.y] = [];
        }
        objectMap[this.y][this.x] = { value: 300, sprite: this.sprite };
    }

    act() {
        // Decrease turns left, if it reaches 0, stop spreading and destroy the sprite
        if (--this.turnsLeft <= 0) {
            this.sprite.destroy();
            this.scheduler.remove(this);
            objectMap[this.y][this.x] = null;
            return;
        }
    
        // 50% chance to spread the fire
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
                
                    let fire = new Fire(newX, newY, this.scheduler);
                                    
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
        if (Math.random() < 0.5) {
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
        console.log("Creating smoke")
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
        app.stage.addChild(this.sprite);
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
        }
    }
}



function createSprite(x, y, position, layer, value = null) {
    if (!layer[y]) {
        layer[y] = [];
    }

    // If a sprite already exists at this position, remove it from the stage
    if (layer?.[y]?.[x]?.sprite) {
        app.stage.removeChild(layer[y][x].sprite);
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
        sprite.zIndex = 5;
        
        // Remove sprites on all layers beneath the UI layer if they exist at the same position
        if (wallMap?.[y]?.[x]?.sprite) {
            app.stage.removeChild(wallMap[y][x].sprite);
            wallMap[y][x].sprite = null;
        }
        if (objectMap?.[y]?.[x]?.sprite) {
            app.stage.removeChild(objectMap[y][x].sprite);
            objectMap[y][x].sprite = null;
        }
        if (floorMap?.[y]?.[x]?.sprite) {
            app.stage.removeChild(floorMap[y][x].sprite);
            floorMap[y][x].sprite = null;
        }
        if (backgroundMap?.[y]?.[x]?.sprite) {
            app.stage.removeChild(backgroundMap[y][x].sprite);
            backgroundMap[y][x].sprite = null;
        }
    } else if (layer === wallMap) {
        sprite.zIndex = 3;

        // Remove sprites on layers beneath the wall layer if they exist at the same position
        if (floorMap?.[y]?.[x]?.sprite) {
            app.stage.removeChild(floorMap[y][x].sprite);
            floorMap[y][x].sprite = null;
        }
        if (backgroundMap?.[y]?.[x]?.sprite) {
            app.stage.removeChild(backgroundMap[y][x].sprite);
            backgroundMap[y][x].sprite = null;
        }
    } else if (layer === objectMap) {
        sprite.zIndex = 2; // Set zIndex for objectMap
    } else if (layer === floorMap) {
        sprite.zIndex = 1;
        
        // Remove sprites on the background layer if they exist at the same position
        if (backgroundMap?.[y]?.[x]?.sprite) {
            app.stage.removeChild(backgroundMap[y][x].sprite);
            backgroundMap[y][x].sprite = null;
        }
    }

    app.stage.addChild(sprite);

    let existingValue = layer[y][x] ? layer[y][x].value : null;
    layer[y][x] = {value: value !== null ? value : existingValue, sprite: sprite};

    // Update zIndex for objectMap based on y position compared to walls
    if (layer === objectMap && wallMap?.[y]?.[x]?.sprite) {
        if (y * TILE_HEIGHT * SCALE_FACTOR < wallMap[y][x].sprite.y) {
            sprite.zIndex = 4; // Object is behind the wall
        }
    }
}




function overlaySprite(x, y, position, value = null) {
    if (!floorMap[y]) {
        floorMap[y] = [];
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
    
    app.stage.addChild(sprite);

    // If value is not provided, keep the existing value or set to null
    let existingValue = floorMap[y][x] ? floorMap[y][x].value : null;
    floorMap[y][x] = {value: value !== null ? value : existingValue, sprite: sprite};
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
class MessageList {
    constructor() {
        this.messages = ["Welcome to the Dungeon of Doom!"];
        this.active = true;
    }
    // a function to draw a box with sprites
    drawUIBox(message) {
        const BOX_HEIGHT = 5;
        const BORDER_TOP_LEFT = { x: 8, y: 9 }; 
        const BORDER_HORIZONTAL = { x: 11, y: 8 }; 
        const BORDER_VERTICAL = { x: 17, y: 7 }; 
        const BORDER_TOP_RIGHT = { x: 6, y: 8 }; 
        const BORDER_BOTTOM_LEFT = { x: 5, y: 1 };
        const BORDER_BOTTOM_RIGHT = { x: 7, y: 9 }; 
        const BLANK_TILE = { x: 21, y: 7};

        // Draw the top border of the box
        createSprite(0, 0, BORDER_TOP_LEFT,uiMap, 214);
        for (let x = 1; x < MAP_WIDTH - 1; x++) {
            createSprite(x, 0, BORDER_HORIZONTAL,uiMap, 196);
        }
        createSprite(MAP_WIDTH - 1, 0, BORDER_TOP_RIGHT,uiMap, 191);

        // Draw the bottom border of the box
        createSprite(0, BOX_HEIGHT - 1, BORDER_BOTTOM_LEFT,uiMap, 192);
        for (let x = 1; x < MAP_WIDTH - 1; x++) {
            createSprite(x, BOX_HEIGHT - 1, BORDER_HORIZONTAL,uiMap, 196);
        }
        createSprite(MAP_WIDTH - 1, BOX_HEIGHT - 1, BORDER_BOTTOM_RIGHT,uiMap, 217);

        // Draw the vertical borders and the message
        for (let y = 1; y < BOX_HEIGHT - 1; y++) {
            createSprite(0, y, BORDER_VERTICAL,uiMap, 179);
            createSprite(MAP_WIDTH - 1, y, BORDER_VERTICAL,uiMap, 179);
            for(let x = 1; x < MAP_WIDTH - 1; x++) {
                createSprite(x, y, BLANK_TILE,uiMap, 0);
            }
            // Write the message
            if (y === Math.floor(BOX_HEIGHT / 2)) {
                for (let i = 0; i < message.length; i++) {
                    let spriteLocation = this.charToSpriteLocation(message.charAt(i));
                    createSprite(i + 1, y, spriteLocation,uiMap, message.charCodeAt(i));
                }
            }
        }
    }
    // a function to pick sprite text
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
    addMessage(message) {
        this.messages.push(message);
        this.render(); // re-render whenever a new message is added
    }
    
    // Toggles the active state
    toggleActive() {
        this.active = !this.active;
    }

    // Renders the text box with the last two messages
    render() {
        if (this.active && this.messages.length > 0) {
            // Extract the last two messages
            const lastMessages = this.messages.slice(-2);
            const messageToShow = lastMessages.join(' ');

            // Call the drawUIBox function to draw the message box
            this.drawUIBox(messageToShow);
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

    const messageList = new MessageList();
    messageList.render();

    PIXI.Loader.shared.onComplete.add(() => {
        for (let i = 0; i < 7; i++) { // assuming you have 4 frames of fire animation
            let rect = new PIXI.Rectangle(i * TILE_WIDTH, 0, TILE_WIDTH, TILE_HEIGHT);
            let texture = new PIXI.Texture(PIXI.Loader.shared.resources.fire.texture.baseTexture, rect);
            fireFrames.push(texture);
        }

        let scheduler = new ROT.Scheduler.Simple();
        let engine = new ROT.Engine(scheduler);
        let player = new Player(PlayerType.HUMAN, randomTile.x, randomTile.y, scheduler, engine, messageList);
        createPlayerSprite(player);
        scheduler.add(player, true); // the player takes turns

        //add some fire
        for (let i = 0; i < 3; i++) {
            let randomTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
            let fire = new Fire(randomTile.x, randomTile.y, scheduler);
            scheduler.add(fire, true); // the fire takes turns
        }

        engine.start(); // start the engine
    });

}