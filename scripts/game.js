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
const MAP_WIDTH = 80;
const MAP_HEIGHT = 60;
const SPRITESHEET_PATH = 'assets/spritesheets/grotto40x30-cp437.png';
const SCALE_FACTOR = 0.5; // Scaling factor for HiDPI displays
const SPRITE_POSITION = 5; // Position of the sprite (in tiles)
const SPRITESHEET_COLUMNS = 23;
const SPRITESHEET_ROWS = 11;

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
            if (map[newTileY][newTileX]?.value === 157) {
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


class NPC {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.sprite = null;

        // You can set the specific attributes for each NPC type here.
        switch(type) {
            // Add cases for your NPC types here.
            default:
                // Add default attributes here.
                break;
        }
    }

    // NPCs can have their own behaviors and methods here.
    move() {
        // Implement NPC movement logic here.
    }
}

//items

class AbstractItem {
    constructor(pk, name, description, itemType, activeAdjective, iconData, activeIconData) {
        this.pk = pk;
        this.name = name;
        this.description = description;
        this.itemType = itemType;
        this.activeAdjective = activeAdjective;
        this.iconData = iconData;
        this.activeIconData = activeIconData;
    }
}

class Item {
    constructor(abstractItem, pk, name, colorName, colorHex, isActive, isUsable, isTakeable) {
        this.AbstractItem = abstractItem;
        this.pk = pk;
        this.name = name;
        this.colorName = colorName;
        this.colorHex = colorHex;
        this.isActive = isActive;
        this.isUsable = isUsable;
        this.isTakeable = isTakeable;
        switch(type) {
            // Add cases for your Item types here.
            default:
                // Add default attributes here.
                break;
        }
    }

    use() {
        // Implement item use logic here.
    }
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
    createSprite(x, y - 1, {x: 16, y: 7}, 177); // middle
    createSprite(x, y - 2, {x: 16, y: 5}, 131); // top
}

function createTransparentVerticalWall(x, y) {
    createSprite(x, y, {x: 16, y: 5}, 131); // footprint
    overlaySprite(x, y - 1, {x: 16, y: 5}, 157); // middle
    createSprite(x, y - 2, {x: 16, y: 5}, 131); // top
}

function createTransparentWall(x, y) {
    createSprite(x, y, {x: 16, y: 7}, 177); // footprint
    overlaySprite(x, y - 1, {x: 16, y: 7}, 157); // middle
    createSprite(x, y - 2, {x: 16, y: 5}, 131); // top
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
    createSprite(x, y - 1, {x: 16, y: 7}, 177); // middle
    createSprite(x, y - 2, {x: 16, y: 5}, 131); // top
}

function createTransparentVerticalWall(x, y) {
    createSprite(x, y, {x: 16, y: 5}, 131); // footprint
    overlaySprite(x, y - 1, {x: 16, y: 5}, 157); // middle
    createSprite(x, y - 2, {x: 16, y: 5}, 131); // top
}

function createTransparentWall(x, y) {
    createSprite(x, y, {x: 16, y: 7}, 177); // footprint
    overlaySprite(x, y - 1, {x: 16, y: 7}, 157); // middle
    createSprite(x, y - 2, {x: 16, y: 5}, 131); // top
}

class Room {
    constructor(pk, name, colorName, colorHex, description, exits, x, y, width, height) {
        this.pk = pk;
        this.name = name;
        this.colorName = colorName;
        this.colorHex = colorHex;
        this.description = description;
        this.exits = exits;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    createRoom() {
        // Create the floor
        for (let i = this.x + 1; i <= this.x + this.width - 2; i++) {
            for (let j = this.y + 1; j < this.y + this.height - 1; j++) {
                createFloor(i, j);
            }
        }

        // Create the walls
        for (let i = this.x; i < this.x + this.width; i++) {
            createWall(i, this.y); // Top wall
            createWall(i, this.y + this.height - 1); // Bottom wall
        }
        for (let j = this.y; j < this.y + this.height; j++) {
            createWall(this.x, j); // Left wall
            createWall(this.x + this.width - 1, j); // Right wall
        }
    }
}


function isPointInRoom(x, y, room) {
    return x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height;
}

function getCenterOfRoom(room) {
    return {
        x: room.x + Math.floor(room.width / 2),
        y: room.y + Math.floor(room.height / 2)
    };
}

function generateVisualWalls() {
    for (let x = 0; x < MAP_WIDTH; x++) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            if (isFloorTile(x, y)) {
                createVisualWallsAround(x, y);
            }
        }
    }
}

function isFloorTile(x, y) {
    // Replace 0 with the appropriate value representing a floor tile.
    return map[y][x]?.value === 0; // assuming 0 is a floor tile
}

function createVisualWallsAround(floorX, floorY) {
    // Check each of the four directions (up, down, left, right).
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            // Skip the center tile and diagonals
            if ((dx === 0 && dy === 0) || (dx !== 0 && dy !== 0)) {
                continue;
            }
            
            let x = floorX + dx;
            let y = floorY + dy;

            // Check if the adjacent tile is a wall
            if (map[y][x]?.value === 1) { // assuming 1 is a wall tile
                createWall(x, y);
            }
        }
    }
}

function generateDungeon() {
    // Set up the dungeon generator
    let dungeonWidth = MAP_WIDTH;
    let dungeonHeight = MAP_HEIGHT;
    let dungeonGenerator = new ROT.Map.Uniform(dungeonWidth, dungeonHeight);
    
    // Create the map array to store the dungeon tiles
    map = new Array(dungeonHeight);
    for (let y = 0; y < dungeonHeight; y++) {
        map[y] = new Array(dungeonWidth);
    }

    // Generate the dungeon and store it in the map array
    dungeonGenerator.create(function(x, y, type) {
        // Type 0 is a floor, type 1 is a wall
        map[y][x] = {
            x: x,
            y: y,
            value: type
        };
    });

    // Now loop through the map array and use PIXI to render the tiles
    for (let x = 0; x < dungeonWidth; x++) {
        for (let y = 0; y < dungeonHeight; y++) {
            let tile = map[y][x];
            if (tile.value === 0) { // Floor tile
                createFloor(tile.x, tile.y);
            } else if (tile.value === 1) { // Wall tile
                createWall(tile.x, tile.y);
            }
        }
    }
}


/// UI functions

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
    createSprite(0, 0, BORDER_TOP_LEFT, 214);
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
        createSprite(x, 0, BORDER_HORIZONTAL, 196);
    }
    createSprite(MAP_WIDTH - 1, 0, BORDER_TOP_RIGHT, 191);

    // Draw the bottom border of the box
    createSprite(0, BOX_HEIGHT - 1, BORDER_BOTTOM_LEFT, 192);
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
        createSprite(x, BOX_HEIGHT - 1, BORDER_HORIZONTAL, 196);
    }
    createSprite(MAP_WIDTH - 1, BOX_HEIGHT - 1, BORDER_BOTTOM_RIGHT, 217);

    // Draw the vertical borders and the message
    for (let y = 1; y < BOX_HEIGHT - 1; y++) {
        createSprite(0, y, BORDER_VERTICAL, 179);
        createSprite(MAP_WIDTH - 1, y, BORDER_VERTICAL, 179);
        for(let x = 1; x < MAP_WIDTH - 1; x++) {
            createSprite(x, y, BLANK_TILE, 0);
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

    // Fill the map with void
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            createVoid(x, y);
        }
    }

    generateDungeon(MAP_WIDTH, MAP_HEIGHT);
    console.log(map);

    let walkableTiles = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (map[y][x].value === 157) {
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

    const messageList = new MessageList();
    messageList.render();
}