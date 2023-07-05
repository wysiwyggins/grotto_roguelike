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

function createSprite(x, y, position, value = null) {
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

    // If value is not provided, keep the existing value or set to null
    let existingValue = map[y][x] ? map[y][x].value : null;
    map[y][x] = {value: value !== null ? value : existingValue, sprite: sprite};
}


function overlaySprite(x, y, position, value = null) {
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

    // If value is not provided, keep the existing value or set to null
    let existingValue = map[y][x] ? map[y][x].value : null;
    map[y][x] = {value: value !== null ? value : existingValue, sprite: sprite};
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
    createSprite(x, y - 1, {x: 16, y: 7}); // middle
    createSprite(x, y - 2, {x: 16, y: 5}); // top
}

function createVerticalWall(x, y) {
    console.log("a vertical wall!")
    createSprite(x, y, {x: 16, y: 5}, 177); // footprint
    createSprite(x, y - 1, {x: 16, y: 5}); // middle
    createSprite(x, y - 2, {x: 16, y: 5}); // top
}

function createTransparentVerticalWall(x, y) {
    createSprite(x, y, {x: 16, y: 5}, 177); // footprint
    overlaySprite(x, y - 1, {x: 16, y: 5}); // middle
    overlaySprite(x, y - 2, {x: 16, y: 5}); // top
}

function createTransparentWall(x, y) {
    createSprite(x, y, {x: 16, y: 7}, 177); // footprint
    overlaySprite(x, y - 1, {x: 16, y: 7}); // middle
    createSprite(x, y - 2, {x: 16, y: 5}); // top
}

function createRoom(x, y, width, height) {
    // Create the floor
    for (let i = x + 1; i < x + width - 1; i++) {
        for (let j = y + 1; j < y + height - 1; j++) {
            //console.log(`Creating floor at ${i}, ${j}`); // <-- Console log added
            createFloor(i, j);
        }
    }

    // Create the walls
    for (let i = x; i < x + width; i++) {
        //console.log(`Creating top wall at ${i}, ${y}`); // <-- Console log added
        createWall(i, y); // Top wall
        //console.log(`Creating bottom wall at ${i}, ${y + height - 1}`); // <-- Console log added
        createWall(i, y + height - 1); // Bottom wall
    }
    for (let j = y; j < y + height; j++) {
        //console.log(`Creating left wall at ${x}, ${j}`); // <-- Console log added
        createWall(x, j); // Left wall
        //console.log(`Creating right wall at ${x + width - 1}, ${j}`); // <-- Console log added
        createWall(x + width - 1, j); // Right wall
    }
}

function createSimpleHallway(room1, room2) {
    // Calculate the center of the first room
    let center1 = {
        x: room1.x + Math.floor(room1.width / 2),
        y: room1.y + Math.floor(room1.height / 2)
    };

    // Calculate the center of the second room
    let center2 = {
        x: room2.x + Math.floor(room2.width / 2),
        y: room2.y + Math.floor(room2.height / 2)
    };

    // Determine the start and end coordinates of the hallway
    let startX = Math.min(center1.x, center2.x);
    let endX = Math.max(center1.x, center2.x);
    let startY = Math.min(center1.y, center2.y);
    let endY = Math.max(center1.y, center2.y);

    // Draw a straight horizontal hallway from the center of the first room to the center of the second room
    for (let x = startX; x <= endX; x++) {

        // Create walls above the hallway, but not within the intersecting rooms
        if(map[center1.y - 1][x]?.value !== 157) {
            createWall(x, center1.y - 1);
        }
        createFloor(x,center1.y);
        
        // Create walls below the hallway, but do not overlap with existing walls
        if(map[center1.y + 1][x]?.value !== 157 && map[center1.y + 1][x]?.value !== 131 && map[center1.y + 2][x]?.value !== 157 && map[center1.y + 1][x]?.value !== 177) {
            createTransparentWall(x, center1.y + 1);
        } else if (map[center1.y + 1][x]?.value !== 157){
            createTransparentVerticalWall(x, center1.y + 1);
        }
    
    }

    // Draw a straight vertical hallway from the end of the horizontal hallway to the center of the second room
    for (let y = startY; y <= endY; y++) {

        // Create walls to the left and right of the hallway, but not within the top intersecting room
        if(map[y][center2.x - 1]?.value !== 157 && map[y -1][center2.x - 1]?.value !== 131  && map[y - 1][center2.x - 1]?.value !== 157) {
            createWall(center2.x - 1, y);
        }
        createFloor(center2.x, y);
        if(map[y][center2.x + 1]?.value !== 157 && map[y -1][center2.x + 1]?.value !== 131 &&map[y - 1][center2.x + 1]?.value !== 157) {
            createWall(center2.x + 1, y);
        }
    }

    // Extend the wall of the vertical hallway into the intersecting room
    if(map[endY + 1][center2.x]?.value !== 157 && map[endY + 1][center2.x - 1]?.value !== 157 && endY + 1 !== room2.y + room2.height - 1) {
        createWall(center2.x, endY + 1);
    }
}

// dungeon generator
function dungeonGeneration() {
    // Use rot.js to create a uniform dungeon map
    const dungeon = new ROT.Map.Uniform(MAP_WIDTH, MAP_HEIGHT);

    // This callback function will be executed for every generated map cell
    const callback = (x, y, value) => {
        if (value === 0) {
            // 0 represents a floor tile
            map[y][x] = 157; // 157 is the floor tile representation in the game
        } else {
            // 1 represents a wall or void
            map[y][x] = 216; // 216 is the void tile representation in the game
        }
    };
    
    dungeon.create(callback);
}

function addFloorsAndVoid() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (map[y][x] === 157) {
                createFloor(x, y);
            } else if (map[y][x] === 216) {
                createVoid(x, y);
            }
        }
    }
}

function isAdjacentToFloor(map, x, y, tileValue) {
    const isAboveFloor = y > 0 && map[y - 1][x].value === tileValue; // Check Up
    const isBelowFloor = y < MAP_HEIGHT - 1 && map[y + 1][x].value === tileValue; // Check Down
    const isLeftFloor = x > 0 && map[y][x - 1].value === tileValue; // Check Left
    const isRightFloor = x < MAP_WIDTH - 1 && map[y][x + 1].value === tileValue; // Check Right

    return isAboveFloor || isBelowFloor || isLeftFloor || isRightFloor;
}

function isAdjacentToFloorAbove(map, x, tileValue) {
    return y > 0 && map[y - 1][x].value === tileValue; // Check Up
}

function isAdjacentToTileWithGivenValue(map, x, y, tileValue) {
    const isAbove = y > 1 && map[y - 1][x].value === tileValue; // Check Up
    const isBelow = y < MAP_HEIGHT - 1 && map[y + 1][x].value === tileValue; // Check Down
    const isLeft = x > 1 && map[y][x - 1].value === tileValue; // Check Left
    const isRight = x < MAP_WIDTH - 1 && map[y][x + 1].value === tileValue; // Check Right

    return isAbove || isBelow || isLeft || isRight;
}

function hasTileWithGivenValueAbove(map, x, y, tileValue) {
    return y > 0 && map[y - 1][x].value === tileValue;
}

function hasTileWithGivenValueBelow(map, x, y, tileValue) {
    return y < MAP_HEIGHT - 1 && map[y + 1][x].value === tileValue;
}


function hasVerticalTilesOnSideWithGivenValue(map, x, y, tileValue, isLeftSide) {
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

function hasTileWithGivenValueOnLeft(map, x, y, tileValue) {
    return x > 0 && map[y][x - 1].value === tileValue;
}

function hasTileWithGivenValueOnRight(map, x, y, tileValue) {
    return x < MAP_WIDTH - 1 && map[y][x + 1].value === tileValue;
}

function hasTileWithGivenValueInMidAndLowerRight(map, x, y, tileValue) {
    const isUpperRight = x < MAP_WIDTH - 1 && y > 1 && map[y - 1][x + 1].value === 216;
    const isMidRight = x < MAP_WIDTH - 1 && map[y][x + 1].value === tileValue;
    const isLowerRight = x < MAP_WIDTH - 1 && y < MAP_HEIGHT - 1 && map[y + 1][x + 1].value === tileValue;

    return isMidRight && isLowerRight && isUpperRight;
}

function hasTileWithGivenValueInMidAndLowerLeft(map, x, y, tileValue) {
    const isUpperLeft = x > 0 && y > 1 && map[y - 1][x - 1].value === 216;
    const isMidLeft = x > 0 && map[y][x - 1].value === tileValue;
    const isLowerLeft = x > 0 && y < MAP_HEIGHT - 1 && map[y + 1][x - 1].value === tileValue;

    return isUpperLeft && isMidLeft && isLowerLeft;
}

function isOnlyUpperLeftCornerTile(map, x, y, tileValue) {
    const aboveLeft = y > 0 && map[y - 1][x -1].value === tileValue;
    const left = x > 0 && map[y][x - 1].value === tileValue;
    const below = y < MAP_HEIGHT - 1 && map[y + 1][x].value === tileValue;
    const right = x < MAP_WIDTH - 1 && map[y][x + 1].value === tileValue;

    return left && aboveLeft && !below && !right;
}

function isUpperLeftCornerTile(map, x, y, tileValue) {
    // Check if y - 1 is within bounds
    if (y > 0) {
        // Check if x - 1 is within bounds, and map[y - 1][x - 1] exists with a 'value' property
        if (x > 0 && map[y - 1][x - 1] && typeof map[y - 1][x - 1].value !== 'undefined') {
            return map[y - 1][x - 1].value === tileValue;
        }
    }
    return false;
}

function isUpperRightCornerTile(map, x, y, tileValue) {
    // Check if y - 1 is within bounds
    if (y > 0) {
        // Check if x - 1 is within bounds, and map[y - 1][x + 1] exists with a 'value' property
        if (x < MAP_WIDTH -1 && map[y - 1][x + 1] && typeof map[y - 1][x + 1].value !== 'undefined') {
            return map[y - 1][x + 1].value === tileValue;
        }
    }
    return false;
}


function isLowerLeftCornerTile(map, x, y, tileValue) {
    // Check if y + 1 is within bounds
    if (y < map.length - 1) {
        // Check if x - 1 is within bounds
        if (x > 0 && map[y + 1][x - 1] && typeof map[y + 1][x - 1].value !== 'undefined') {
            return map[y + 1][x - 1].value === tileValue;
        }
    }
    return false;
}


function isLowerRightCornerTile(map, x, y, tileValue) {
    // Check if y + 1 is within bounds
    if (y < map.length - 1) {
        // Check if x - 1 is within bounds
        if (x < MAP_WIDTH - 1 && map[y + 1][x - 1] && typeof map[y + 1][x - 1].value !== 'undefined') {
            return map[y + 1][x - 1].value === tileValue;
        }
    }
    return false;
}



function fillWallCorners() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            // Check if the current tile is a floor
            if (map[y][x].value === 216) {
                // Check for upper left corner
                if (isUpperLeftCornerTile(map, x, y, 157)) {
                    console.log("void with upper-left floor tile detected");
                    if (hasTileWithGivenValueOnRight(map, x, y, 177) &&
                        hasTileWithGivenValueBelow(map, x, y, 177)) {
                        console.log("making a corner wall"); 
                        createWall(x - 1, y);
                    }
                }
                // Check for upper right corner
                if (isUpperRightCornerTile(map, x, y, 157)) {
                    console.log("void with upper-right floor tile detected");
                    if (hasTileWithGivenValueOnLeft(map, x, y, 177) &&
                        hasTileWithGivenValueBelow(map, x, y, 177)) {
                        console.log("making a corner wall"); 
                        createWall(x + 1, y);
                    }
                }
                // Check for lower left corner
                if (isLowerLeftCornerTile(map, x, y, 157)) {
                    console.log("void with lower-left floor tile detected");
                    if (hasTileWithGivenValueOnRight(map, x, y, 177) &&
                        hasTileWithGivenValueAbove(map, x, y, 177)) {
                        console.log("making a corner wall"); 
                        createVerticalWall(x - 1, y);
                    }
                }
                // Check for lower right corner
                if (isLowerRightCornerTile(map, x, y, 157)) {
                    console.log("void with lower-right floor tile detected");
                    if (hasTileWithGivenValueOnLeft(map, x, y, 177) &&
                        hasTileWithGivenValueAbove(map, x, y, 177)) {
                        console.log("making a corner wall");    
                        createVerticalWall(x + 1, y);
                    }
                }
            }
        }
    }
}



function evaluateMapAndCreateWalls(map) {
    // Loop through each row
    for (let y = 0; y < MAP_HEIGHT; y++) {
        // Loop through each column
        for (let x = 0; x < MAP_WIDTH; x++) {
            // Check if the current tile has a value of 216
            if (map[y][x].value === 216) {
                //console.log("I found a void at (" + x + ", " + y + ")");

                // First, check for vertical walls
                // Check if adjacent to floor
                let isAdjacentToFloorAbove = hasTileWithGivenValueAbove(map, x, y, 157);
                
                let isAdjacentToFloor =
                    isAdjacentToFloorAbove ||
                    hasTileWithGivenValueBelow(map, x, y, 157) ||
                    hasTileWithGivenValueOnLeft(map, x, y, 157) ||
                    hasTileWithGivenValueOnRight(map, x, y, 157);

                if (isAdjacentToFloor) {
                    if (isAdjacentToFloorAbove) {
                        // Run the createTransparentWall function at this location (x, y)
                        //console.log("Creating transparent wall at (" + x + ", " + y + ")");
                        createTransparentWall(x, y);
                    } else {
                        // Run the createWall function at this location (x, y)
                        //console.log("Creating wall at (" + x + ", " + y + ")");
                        createWall(x, y);
                    }
                } else {
                    //console.log("Void at (" + x + ", " + y + ") is NOT adjacent to a floor");
                }
            }
        }
    }
}



/// UI functions

// a function to draw a box with sprites
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
// a function to pick sprite text
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
// a class for screen text
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
    dungeonGeneration();
    addFloorsAndVoid();
    evaluateMapAndCreateWalls(map);
    fillWallCorners(map);


    let walkableTiles = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (map[y][x].value === 157) {
                walkableTiles.push({x: x, y: y});
            }
        }
    }

    let randomTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];

    let player = new Player(PlayerType.HUMAN, randomTile.x, randomTile.y);
    createPlayerSprite(player);
    
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