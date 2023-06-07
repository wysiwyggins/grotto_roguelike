const { createPlayerSprite, movePlayer } = require('./player.js');
const { createFloor, createWall, createTransparentVerticalWall, createTransparentWall, createRoom, createSimpleHallway } = require('./map.js');
//const { createMonsterSprite, moveMonsterSprite } = require('./sprites.js');


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
// This function will run when the spritesheet has finished loading
function setup() {

    // Generate rooms
    let room1 = {x: 10, y: 10, width: 10, height: 10};
    let room2 = {x: 25, y: 10, width: 10, height: 10};
    let room3 = {x: 10, y: 25, width: 10, height: 10};
    let room4 = {x: 25, y: 25, width: 10, height: 10}; // Additional room

    // Then generate rooms
    createRoom(room1.x, room1.y, room1.width, room1.height);
    createRoom(room2.x, room2.y, room2.width, room2.height);
    createRoom(room3.x, room3.y, room3.width, room3.height);
    createRoom(room4.x, room4.y, room4.width, room4.height);


    createSimpleHallway(room1, room2);
    createSimpleHallway(room2, room4);
    createSimpleHallway(room4, room3);
    createSimpleHallway(room3, room1);

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