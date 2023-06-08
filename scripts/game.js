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
        let newX = this.x;
        let newY = this.y;
        
        switch(direction) {
            case 'up':
                console.log("up");
                newY -= 1;
                break;
            case 'down':
                console.log("down");
                newY += 1;
                break;
            case 'left':
                console.log("left");
                newX -= 1;
                break;
            case 'right':
                console.log("right");
                newX += 1;
                break;
        }
        
        // Check for collisions or going out of bounds
        if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT) {
            if (map[newY][newX] === 0) { // Assuming 0 is an empty tile
                this.x = newX;
                this.y = newY;
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


// This function will run when the spritesheet has finished loading
function setup() {

    // Fill the map with void
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            createVoid(x, y);
        }
    }

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
    
}
