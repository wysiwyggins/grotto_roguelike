// Create a new Pixi Application
let app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0xFFFFFF,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});
let player; 
app.stage.sortableChildren = true;

// Add the app view to our HTML document
document.getElementById('game').appendChild(app.view);

// Set up some constants
const TILE_WIDTH = 40;
const TILE_HEIGHT = 30;
const MAP_WIDTH = 60;
const MAP_HEIGHT = 50;
const TILEMAP_PATH = 'assets/maps/rooms.tmj';
const SPRITESHEET_PATH = 'assets/spritesheets/grotto40x30-cp437.png';
const SCALE_FACTOR = 0.5; // Scaling factor for HiDPI displays
const SPRITE_POSITION = 5; // Position of the sprite (in tiles)
const SPRITESHEET_COLUMNS = 23;
const SPRITESHEET_ROWS = 11;
NUM_ITERATIONS = 1;

let map = new Array(MAP_HEIGHT);
for (let y = 0; y < MAP_HEIGHT; y++) {
    map[y] = new Array(MAP_WIDTH);
    for (let x = 0; x < MAP_WIDTH; x++) {
        map[y][x] = 0; // 0 will represent an empty tile, you can use other numbers to represent other types of tiles
    }
}

// Load the spritesheet using the global PIXI.Loader object
PIXI.Loader.shared.add('tiles', SPRITESHEET_PATH).load(setup);


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
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.footprintTile;
        this.headTile;
        this.sprite = null; 
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
            if (map[newTileY][newTileX]?.value === 0) {
                this.x = newTileX;
                this.y = newTileY;
            }
        }
    
        // Update sprite positions
        this.sprite.footprint.x = this.x * TILE_WIDTH * SCALE_FACTOR;
        this.sprite.footprint.y = this.y * TILE_HEIGHT * SCALE_FACTOR;
        this.sprite.overlay.x = this.sprite.footprint.x;
        this.sprite.overlay.y = this.sprite.footprint.y - TILE_HEIGHT * SCALE_FACTOR;
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
    //console.log(`Creating sprite at (${x}, ${y}) with sprite:`, sprite, 'and value:', value);
}

function overlaySprite(x, y, position, value) {
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
    map[y][x] = {value: value, sprite: sprite};
}

function createVoid(x, y) {
    createSprite(x, y, {x: 9, y: 9}, 2);

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
    //console.log(`Creating floor at (${x}, ${y})`);
    createSprite(x, y, { x: 19, y: 6 }, 0);
}
  
function createWall(x, y) {
    //console.log(`Creating wall at (${x}, ${y})`);
    createSprite(x, y, { x: 16, y: 7 }, 1); // footprint
    createSprite(x, y - 1, { x: 16, y: 7 }, 1); // middle
    createSprite(x, y - 2, { x: 16, y: 5 }, 1); // top
}
  

function createTransparentWall(x, y) {
    createSprite(x, y, {x: 16, y: 5}, 1); // footprint
    createFloor(x, y-1);
    overlaySprite(x, y-1, {x: 16, y: 7}, 0); // middle
    overlaySprite(x, y -2, {x: 16, y: 5}, 1); // top
}



function getAdjacentTiles(x, y) {
    let adjacentTiles = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx !== 0 || dy !== 0) {
                let nx = x + dx;
                let ny = y + dy;
                if (isInBounds(nx, ny)) {
                    adjacentTiles.push(map[ny][nx]);
                }
            }
        }
    }
    return adjacentTiles;
}

//The isInBounds function is a simple utility function that checks whether
// a given coordinate (x, y) is within the bounds of a two-dimensional map. 
//The bounds of the map are determined by the constants MAP_WIDTH and MAP_HEIGHT.

function isInBounds(x, y) {
    return x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;
}


function isFloorTile(x, y) {
    return map[y][x]?.value === 0; //0 is our walkable tile value for now
}


function isBottomWall(x, y) {
    // Check if the tile is the bottom wall of a horizontal hallway
    return (
        y < MAP_HEIGHT - 1 &&
        map[y][x] === 0 &&
        map[y + 1][x] === 1
    );
}

//Rot.js uniform dungeon generator, doesn't totally work yet
function generateDungeon() {
    console.log('Generating dungeon...');
    let dungeonWidth = MAP_WIDTH;
    let dungeonHeight = MAP_HEIGHT;
    let options = {
        roomWidth: [5, 40],
        roomHeight: [5, 50],
    };
    let dungeonGenerator = new ROT.Map.Uniform(dungeonWidth, dungeonHeight, options);

    // Create the map array to store the dungeon tiles
    map = new Array(dungeonHeight);
    for (let y = 0; y < dungeonHeight; y++) {
        map[y] = new Array(dungeonWidth);
    }

    // Generate the dungeon and store it in the map array
    dungeonGenerator.create(function (x, y, type) {
        // Type 0 is a floor, type 1 is a wall
        map[y][x] = type === 0 ? 0 : 1;
    });

    // Iterate over the map and create voids, walls, and floors
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        applyMatchingRules();
    }

    console.log('Dungeon generation complete.');
}


function applyMatchingRules() {
    let updatedMap = new Array(MAP_HEIGHT);
    for (let y = 0; y < MAP_HEIGHT; y++) {
        updatedMap[y] = new Array(MAP_WIDTH);
        for (let x = 0; x < MAP_WIDTH; x++) {
            updatedMap[y][x] = map[y][x];
        }
    }

    for (let x = 0; x < MAP_WIDTH; x++) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            updatedMap[y][x] = applyMatchingRule(x, y);
        }
    }

    map = updatedMap;
}

function applyMatchingRule(x, y) {
    if (map[y][x] === 0) {
        createFloor(x, y);
        return 0;
    }

    if (map[y][x] === 1) {
        createWall(x, y);
        return 1;
    }

    if (map[y][x] === 1) {
        let adjacentTiles = getAdjacentTiles(x, y);
        if (adjacentTiles.every(tile => tile === 1)) {
            createVoid(x, y);
            return -1;
        }
    }

    if (map[y][x] === 1 && y < MAP_HEIGHT - 1 && map[y + 1][x] === 2 && map[y][x - 1] === -1) {
        createSprite(x, y, { x: 12, y: 5 }, -1);
        return -1;
    }

    if (map[y][x] === 2 && y < MAP_HEIGHT - 1 && map[y + 1][x] === 1 && map[y][x - 1] === 2) {
        createSprite(x, y, { x: 12, y: 5 }, -1);
        return -1;
    }

    if (map[y][x] === 2 && map[y][x - 1] === -1 && map[y - 1][x] === 1) {
        createSprite(x, y - 1, { x: 16, y: 7 }, -1);
        return -1;
    }

    return map[y][x];
}

// Tiled map importer, also not working
function importTilemapLayers(room) {
    // Load the tilemap JSON file
    PIXI.Loader.shared.add('tilemap', TILEMAP_PATH).load((loader, resources) => {
      let tilemap = resources.tilemap.data;
  
      // Extract the desired layers based on the room string
      let backgroundLayer = tilemap.layers.find(layer => layer.name === `${room}-background`);
      let layer2 = tilemap.layers.find(layer => layer.name === `${room}-2`);
  
      // Calculate the position to place the layers in the center of the map
      let offsetX = Math.floor((MAP_WIDTH - backgroundLayer.width) / 2);
      let offsetY = Math.floor((MAP_HEIGHT - backgroundLayer.height) / 2);
  
      // Iterate over each tile in the layers and add to the map array
      for (let y = 0; y < backgroundLayer.height; y++) {
        for (let x = 0; x < backgroundLayer.width; x++) {
          let tileIndex = y * backgroundLayer.width + x;
          let backgroundTile = backgroundLayer.data[tileIndex];
          let layer2Tile = layer2.data[tileIndex];
  
          // Calculate the position in the ROT.js map for the current tile
          let mapX = offsetX + x;
          let mapY = offsetY + y;
  
          // Create void tiles around the imported layers
          if (mapX < offsetX || mapY < offsetY || mapX >= offsetX + backgroundLayer.width || mapY >= offsetY + backgroundLayer.height) {
            createVoid(mapX, mapY);
          }
  
          // Add the tiles to the map array
          map[mapX][mapY].backgroundTile = backgroundTile;
          map[mapX][mapY].layer2Tile = layer2Tile;
        }
      }
    });
  }
  
  
function tileIndexToPosition(tileIndex) {
const TILESET_COLUMNS = 23;
let spriteColumn = (tileIndex - 1) % TILESET_COLUMNS;
let spriteRow = Math.floor((tileIndex - 1) / TILESET_COLUMNS);
return { x: spriteColumn, y: spriteRow };
}

// Textbox stuff, sometimes has problems clearing the tiles underneath it, which is weird because
// createSprite() should do this already

function drawUIBox(message) {
    const BOX_HEIGHT = 5;
    const BORDER_TOP_LEFT = { x: 8, y: 9 }; 
    const BORDER_HORIZONTAL = { x: 11, y: 8 }; 
    const BORDER_VERTICAL = { x: 17, y: 7 }; 
    const BORDER_TOP_RIGHT = { x: 6, y: 8 }; 
    const BORDER_BOTTOM_LEFT = { x: 5, y: 1 };
    const BORDER_BOTTOM_RIGHT = { x: 7, y: 9 }; 
    const BLANK_TILE = { x: 0, y: 0};

    // Draw the top border of the box
    createSprite(0, 0, BORDER_TOP_LEFT, 3);
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
        createSprite(x, 0, BORDER_HORIZONTAL, 3);
    }
    createSprite(MAP_WIDTH - 1, 0, BORDER_TOP_RIGHT, 3);

    // Draw the bottom border of the box
    createSprite(0, BOX_HEIGHT - 1, BORDER_BOTTOM_LEFT, 3);
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
        createSprite(x, BOX_HEIGHT - 1, BORDER_HORIZONTAL, 3);
    }
    createSprite(MAP_WIDTH - 1, BOX_HEIGHT - 1, BORDER_BOTTOM_RIGHT, 3);

    // Draw the vertical borders and the message
    for (let y = 1; y < BOX_HEIGHT - 1; y++) {
        createSprite(0, y, BORDER_VERTICAL, 3);
        createSprite(MAP_WIDTH - 1, y, BORDER_VERTICAL, 3);
        for(let x = 1; x < MAP_WIDTH - 1; x++) {
            createSprite(x, y, BLANK_TILE, 3);
        }
        // Write the message
        if (y === Math.floor(BOX_HEIGHT / 2)) {
            for (let i = 0; i < message.length; i++) {
                let spriteLocation = charToSpriteLocation(message.charAt(i));
                createSprite(i + 1, y, spriteLocation, message.charCodeAt(i));
            }
        }
    }
}

function charToSpriteLocation(char) {
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

class MessageList {
    constructor() {
        this.messages = ["Welcome to the Dungeon of Doom!"];
        this.active = true;
    }
    
    // Adds a message to the list
    addMessage(message) {
        this.messages.push(message);
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
            drawUIBox(messageToShow);
        }
    }
}

// This function will run when the spritesheet has finished loading
function setup() {
    
    //importTilemapLayers('15-a');
    generateDungeon();
    
    const messageList = new MessageList();
    messageList.render();

    
    //console.log(map);
    
    let walkableTiles = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (map[y][x].value === 0) {
                walkableTiles.push({x: x, y: y});
            }
        }
    }

    let randomIndex = Math.floor(Math.random() * walkableTiles.length);
    let randomTile = walkableTiles[randomIndex];

    if (randomTile) {
        player = new Player(PlayerType.HUMAN, randomTile.x, randomTile.y);
        createPlayerSprite(player);
    } else {
        console.error('No walkable tile found');
    }
    
    window.addEventListener('keydown', function(event) {
        switch (event.key) {
            case 'ArrowUp':
                player.move('up');
                break;
            case 'ArrowDown':
                player.move('down');
                break;
            case 'ArrowLeft':
                player.move('left');
                break;
            case 'ArrowRight':
                player.move('right');
                break;
            default:
                break;
        }
    });

    
}