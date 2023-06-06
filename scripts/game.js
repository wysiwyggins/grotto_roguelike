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
const MAP_WIDTH = 60;
const MAP_HEIGHT = 38;
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

function createPlayerSprite(x, y) {
    const FOOTPRINT_SPRITE_POSITION = {x: 10, y: 5};
    const OVERLAY_SPRITE_POSITION = {x: 1, y: 0};
    let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
    let footprintTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        FOOTPRINT_SPRITE_POSITION.x * TILE_WIDTH, 
        FOOTPRINT_SPRITE_POSITION.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));

    let spriteFootprint = new PIXI.Sprite(footprintTexture);
    spriteFootprint.scale.set(SCALE_FACTOR);
    

    // Create the overlay sprite
    let overlayTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        OVERLAY_SPRITE_POSITION.x * TILE_WIDTH, 
        OVERLAY_SPRITE_POSITION.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteOverlay = new PIXI.Sprite(overlayTexture);
    spriteOverlay.scale.set(SCALE_FACTOR);

    //character tiles positions
    spriteFootprint.x = x * TILE_WIDTH * SCALE_FACTOR;
    spriteFootprint.y = y * TILE_HEIGHT * SCALE_FACTOR;
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

    // If a sprite already exists at this position, remove it from the stage
    if (map[y][x] && map[y][x].sprite) {
        app.stage.removeChild(map[y][x].sprite);
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
    map[y][x] = {value: value, sprite: sprite};
}
function createVoid(x, y) {
    createSprite(x, y, {x: 9, y: 9}, 216);

    let sprite = map[y][x].sprite;

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
    createSprite(x, y, {x: 19, y: 6}, 157);
}

function createWall(x, y) {
    createSprite(x, y, {x: 16, y: 7}, 177); // footprint
    createSprite(x, y - 1, {x: 16, y: 7}, null); // middle
    createSprite(x, y - 2, {x: 16, y: 5}, null); // top
}

function createRoom(x, y, width, height) {
    // Create the floor
    for (let i = x + 1; i < x + width - 1; i++) {
        for (let j = y + 1; j < y + height - 1; j++) {
            console.log(`Creating floor at ${i}, ${j}`); // <-- Console log added
            createFloor(i, j);
        }
    }

    // Create the walls
    for (let i = x; i < x + width; i++) {
        console.log(`Creating top wall at ${i}, ${y}`); // <-- Console log added
        createWall(i, y); // Top wall
        console.log(`Creating bottom wall at ${i}, ${y + height - 1}`); // <-- Console log added
        createWall(i, y + height - 1); // Bottom wall
    }
    for (let j = y; j < y + height; j++) {
        console.log(`Creating left wall at ${x}, ${j}`); // <-- Console log added
        createWall(x, j); // Left wall
        console.log(`Creating right wall at ${x + width - 1}, ${j}`); // <-- Console log added
        createWall(x + width - 1, j); // Right wall
    }
}


// This function will run when the spritesheet has finished loading
function setup() {
    
   

    // Fill the map with void
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            createVoid(x, y);
        }
    }

    // Generate rooms
    createRoom(10, 10, 10, 10); // Parameters are (x, y, width, height)
    createRoom(25, 10, 10, 10);
    createRoom(10, 25, 10, 10);

    // Generate the player at a random walkable position
    let walkableTiles = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (map[y][x].value === 157) {
                walkableTiles.push({x: x, y: y});
            }
        }
    }

    let randomTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
    createPlayerSprite(randomTile.x, randomTile.y);

    function movePlayer(dx, dy) {
        let newX = playerSprite.footprint.x / (TILE_WIDTH * SCALE_FACTOR) + dx;
        let newY = playerSprite.footprint.y / (TILE_HEIGHT * SCALE_FACTOR) + dy;
    
        // Check if the new position is within the map bounds and is a floor tile
        if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT && map[newY][newX]?.value === 157) {
            console.log(`Moving player to ${newX}, ${newY}`); // <-- Console log added
            playerSprite.footprint.x += dx * TILE_WIDTH * SCALE_FACTOR;
            playerSprite.footprint.y += dy * TILE_HEIGHT * SCALE_FACTOR;
            playerSprite.overlay.x += dx * TILE_WIDTH * SCALE_FACTOR;
            playerSprite.overlay.y += dy * TILE_HEIGHT * SCALE_FACTOR;
        } else {
            console.log(`Blocked movement to ${newX}, ${newY}. Tile type: ${map[newY]?.[newX]?.value || 'Out of bounds'}`); // <-- Console log added
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
