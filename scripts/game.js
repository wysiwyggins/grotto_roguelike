// Create a new Pixi Application
let app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0xFFFFFF,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});

// Add the app view to our HTML document
document.getElementById('game').appendChild(app.view);

// Set up some constants
const TILE_WIDTH = 40;
const TILE_HEIGHT = 30;
const MAP_WIDTH = 40;
const MAP_HEIGHT = 30;
const SPRITESHEET_PATH = 'assets/spritesheets/grotto40x30-cp437.png';
const SCALE_FACTOR = 0.5; // Scaling factor for HiDPI displays
const SPRITE_POSITION = 5; // Position of the sprite (in tiles)

let map = new Array(MAP_HEIGHT);
for (let y = 0; y < MAP_HEIGHT; y++) {
    map[y] = new Array(MAP_WIDTH);
    for (let x = 0; x < MAP_WIDTH; x++) {
        map[y][x] = 0; // 0 will represent an empty tile, you can use other numbers to represent other types of tiles
    }
}

// Load the spritesheet using the global PIXI.Loader object
PIXI.Loader.shared.add('tiles', SPRITESHEET_PATH).load(setup);

function createPlayerSprite() {
    const FOOTPRINT_SPRITE_POSITION = {x: 10, y: 5};
    const OVERLAY_SPRITE_POSITION = {x: 1, y: 0};
    let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
    let footprintTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        FOOTPRINT_SPRITE_POSITION.x * TILE_WIDTH, 
        FOOTPRINT_SPRITE_POSITION.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));

    let spriteFootprint = new PIXI.Sprite(footprintTexture);
    spriteFootprint.scale.set(SCALE_FACTOR);
    spriteFootprint.x = SPRITE_POSITION * TILE_WIDTH * SCALE_FACTOR;
    spriteFootprint.y = SPRITE_POSITION * TILE_HEIGHT * SCALE_FACTOR;

    // Create the overlay sprite
    let overlayTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        OVERLAY_SPRITE_POSITION.x * TILE_WIDTH, 
        OVERLAY_SPRITE_POSITION.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteOverlay = new PIXI.Sprite(overlayTexture);
    spriteOverlay.scale.set(SCALE_FACTOR);
    spriteOverlay.x = spriteFootprint.x;
    spriteOverlay.y = spriteFootprint.y - TILE_HEIGHT * SCALE_FACTOR;

    // Add both sprites to the stage
    app.stage.addChild(spriteFootprint);
    app.stage.addChild(spriteOverlay);

    // Store sprites for movement
    playerSprite = { footprint: spriteFootprint, overlay: spriteOverlay };
}

function createSprite(x, y, position, value) {
    if (!map[y]) {
        map[y] = [];
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
    map[y][x] = value;
}
function createVoid(x, y){
    createSprite(x, y, {x: 9, y: 10}, 216);
}

function createFloor(x, y) {
    createSprite(x, y, {x: 19, y: 6}, 157);
}

function createWall(x, y) {
    createSprite(x, y, {x: 16, y: 7}, null); // footprint
    createSprite(x, y - 1, {x: 16, y: 7}, null); // middle
    createSprite(x, y - 2, {x: 16, y: 5}, 177); // top
}

// This function will run when the spritesheet has finished loading
function setup() {
    
   

    //init map with floor tiles
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            createFloor(y,x);
        }
    }

    createPlayerSprite();

    createWall(10, 10);
    createWall(11, 10);
    createWall(12, 10);

    function movePlayer(dx, dy) {
        let newX = playerSprite.footprint.x / (TILE_WIDTH * SCALE_FACTOR) + dx;
        let newY = playerSprite.footprint.y / (TILE_HEIGHT * SCALE_FACTOR) + dy;
            
        // Check if the new position is within the map bounds and is a floor tile
        if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT && map[newY][newX] === 157) {
            playerSprite.footprint.x += dx * TILE_WIDTH * SCALE_FACTOR;
            playerSprite.footprint.y += dy * TILE_HEIGHT * SCALE_FACTOR;
            playerSprite.overlay.x += dx * TILE_WIDTH * SCALE_FACTOR;
            playerSprite.overlay.y += dy * TILE_HEIGHT * SCALE_FACTOR;
        }

        app.stage.children.sort((a, b) => {
            // Fetch the actual y position for comparison
            let ay = a === playerSprite.overlay ? playerSprite.footprint.y : a.y;
            let by = b === playerSprite.overlay ? playerSprite.footprint.y : b.y;
        
            if (ay === by) {
                // Fetch the actual x position for comparison
                let ax = a === playerSprite.overlay ? playerSprite.footprint.x : a.x;
                let bx = b === playerSprite.overlay ? playerSprite.footprint.x : b.x;
        
                return ax - bx;
            }
            return ay - by;
        });
    }

    // Listen for keyboard input
    // Listen for keyboard input
    window.addEventListener("keydown", function(event) {
        switch(event.key) {
            case 'ArrowUp':
                movePlayer(0, -1);
                break;
            case 'ArrowDown':
                movePlayer(0, 1);
                break;
            case 'ArrowLeft':
                movePlayer(-1, 0);
                break;
            case 'ArrowRight':
                movePlayer(1, 0);
                break;
            default:
                break;
        }
    });



   
}
