// Create a new Pixi Application
let app = new PIXI.Application({
    width: 1200,
    height: 752,
    backgroundColor: 0xf5f5ee,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});

app.stage.sortableChildren = true;
// pixi uses this to switch zIndex layering within one of it's containers

let uiContainer = new PIXI.Container();
let uiContainerShown = true;
let uiMaskContainer = new PIXI.Container();
let gameContainer = new PIXI.Container();

//I've currently only got three pixi containers to render sprites to the screen,
//gameContainer has the game stage, uiMask is a translucent white background for UIBoxes
//and uiContainer has the uiBox borders and content

app.stage.addChild(gameContainer);
gameContainer.sortableChildren = true;
app.stage.addChild(uiMaskContainer);
app.stage.addChild(uiContainer);

//adding a global stub for the player. This kind of precludes fun things like multiple players, but oh well
// there is an array of players still from when I thought I'd have multiple players
let player = null;
// Add the app view to our HTML document
document.getElementById('game').appendChild(app.view);

// Set up some constants
const rect = app.view.getBoundingClientRect();
const TILE_WIDTH = 40;
const TILE_HEIGHT = 30;
const MAP_WIDTH = 60;
const MAP_HEIGHT = 50;
const SPRITESHEET_PATH = 'assets/spritesheets/grotto40x30-cp437.png';
const SCALE_FACTOR = 0.5; // Scaling factor for HiDPI displays
const SPRITE_POSITION = 5; // Position of the sprite (in tiles)
const SPRITESHEET_COLUMNS = 23;
const SPRITESHEET_ROWS = 11;
//dungeon is used by rot.js' dungeon drawing functions, we need a global stub to get things like
//door locations
let dungeon = null;
let currentTreasureRoom; // right now one room has locked doors.
let globalDoorCounter = 0;

//console.log('Initializing maps');
// maps are arrays that I am using really messily. they have a value which is a number
// that started out as the number of the tile being displayed, but I also use it for game logic
//like pathfinding. they can also hold a sprite for easily accessing the sprite objects that are being displayed
// in the pixi containers. THey also allow me to have 'layers' without having a bunch more pixi containers.
let backgroundMap = createEmptyMap();
//background is the black void and the shadows that make the rooms look like towers in the dark
let floorMap = createEmptyMap();
//floor is used for pathfinding, it also includes the 'footprint' tiles of walls, since those are used for pathfinding
let objectMap = createEmptyMap();
//items
let doorMap = createEmptyMap();
//doors
let wallMap = createEmptyMap();
// the height of walls, (their middle and top tiles)
let atmosphereMap = createEmptyMap();
// fire, smoke and gas
let uiMaskMap = createEmptyMap();
// the background of uiboxes
let uiMap = createEmptyMap();

let overlayMap = createEmptyMap();
// the content of uiboxes

let engine;
let gameOver = false;
var players = [];
let activeEntities = [];
var messageList;
var inspector;

//ticker is a tween thing I use for things that animate in place, like fire and smoke
createjs.Ticker.framerate = 60;
createjs.Ticker.addEventListener("tick", createjs.Tween);

//var audio = new Audio('assets/sound/grottoAudiosprite.mp3');
//audio.play();

//initialize each of the map arrays
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

//loading animated sprite tiles for fire and smoke

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
//console.log(smokeFrames);

//howler.js object for our sound sprites goes here:
var sound = new Howl({
    src: [
      '../assets/sound/grottoAudiosprite.ogg', 
      '../assets/sound/grottoAudiosprite.m4a', 
      '../assets/sound/grottoAudiosprite.mp3', 
      '../assets/sound/grottoAudiosprite.ac3'
    ],
    sprite: {
        arrow_hit: [0, 2969],
        arrow_miss: [4000, 2969],
        feets: [8000, 418],
        fireball: [10000, 2969],
        hallway: [14000, 2000],
        heal: [17000, 2969],
        hit: [21000, 2969],
        levelout: [25000, 2969],
        lock: [29000, 11886],
        magic: [42000, 5941],
        ouch: [49000, 4455],
        pickup: [55000, 4455],
        plunk1: [61000, 2969],
        plunk2: [65000, 10399],
        plunk3: [77000, 9779]
      },
      volume: 1
  });

function playDoorSound() {
    sound.play('plunk3');
};

function playFootstepSound() {
    sound.play('feets');
};
function playArrowSound(didHit) {
    if (didHit) {
        sound.play('arrow_hit');
    } else {    
        sound.play('arrow_miss');
    }
};

function playPickupSound() {
    sound.play('pickup');
}

function playFireballSound() {
    sound.play('fireball');
}
    
// there are different player sprites for PLayerTypes, not yet used, might be removed

const PlayerType = Object.freeze({
    "HUMAN": 0,
    "ANIMAL": 1,
    "GHOST": 2,
    "ROBOT": 3,
    "BIRD": 4,
    "OBELISK": 5,
    "FUNGUS": 6,
    "SKELETON" : 7,
    "VEGETABLE": 8,
    "PILE": 9
    
});

class Player {
    constructor(type, x, y, scheduler, engine, messageList, inspector) {
        this.name = "Bivoj";
        this.isDead = false;
        this.isSkeletonized = false;
        this.isTargeting = false;
        this.type = type;
        this.x = x;
        this.y = y;
        this.prevX = null;
        this.prevY = null;
        //players are made of two tiles, a head and feet, they also have some shadow tiles
        //that do complex stuff to show or hide on walls and floors
        this.footprintTile;
        this.headTile;
        this.sprite = {}; 
        this.range = 10;
        //we want to warn the player if they are about to step in fire
        this.attemptingFireEntry = false;
        this.fireEntryDirection = null;
        this.headShadowTile = {x: 14, y: 9};
        this.footShadowTile = {x: 8, y: 6};
        this.sprite.shadow = null;
        this.footShadowTile.zIndex = 1.5;
        //scheduler decides when monsters and players take their turns
        this.scheduler = scheduler;
        this.engine = engine;
        this.messageList = messageList;
        this.inspector = inspector;

        window.addEventListener('keydown', (event) => {
            this.handleKeydown(event);
        });
        window.addEventListener('mousedown', (event) => {
            this.handleClick(event);
        });
        window.addEventListener('mousemove', (event) => {
            if (this.isTargeting) {
                // calculate tile coordinates from pixel coordinates
                let relativeX = event.clientX - rect.left;
                let relativeY = event.clientY - rect.top;
                
                let x = Math.floor(relativeX / (TILE_WIDTH * SCALE_FACTOR));
                let y = Math.floor(relativeY / (TILE_HEIGHT * SCALE_FACTOR));
                
                // Update the targeting sprite
                this.removeTargetingSprite();
                this.displayTargetingSprite(x, y);
            }
        });
        // stats
        this.blood = 100; //health
        this.isBurning = false;
        this.burningTurns = 0;
        this.inventory = [];
        this.arrows = 0;
        
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
            case PlayerType.PILE:
                this.footprintPosition = {x: 7, y: 1};
                this.headPosition = {x: 0, y: 0};  
                break;
            default:
                this.footprintPosition = {x: 8, y: 5};
                this.headPosition = {x: 1, y: 0};
                break;
        }
    }
    // check to see if anyone is still alive. When the player is dead the game goes into zero
    // player mode
    static checkLivingPlayers() {
        for (let player of players) {
            if (!player.isDead) {
                return true;
            }
        }
        return false;
    }
    canSeeMonster(monsters) {
        for (let monster of monsters) {
            let dx = this.x - monster.x;
            let dy = this.y - monster.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
    
            if (distance <= this.range) {  // Use the player's vision range
                let lineToMonster = line({x: this.x, y: this.y}, {x: monster.x, y: monster.y});
                let seen = true;
                for (let point of lineToMonster) {
                    let x = point.x;
                    let y = point.y;
                    if (floorMap[y][x].value !== 157 || (doorMap[y] && doorMap[y][x])) {
                        seen = false;
                    }
                }
                if (seen) return true;
            }
        }
        return false;
    }
    handleClick(event) {
        // prevent default behavior of the event
        event.preventDefault();

        // calculate tile coordinates from pixel coordinates
        // use relative positions since we center the canvas with CSS
        let relativeX = event.clientX - rect.left;
        let relativeY = event.clientY - rect.top;

        let x = Math.floor(relativeX / (TILE_WIDTH * SCALE_FACTOR));
        let y = Math.floor(relativeY / (TILE_HEIGHT * SCALE_FACTOR));

        // If player is in targeting mode
        if (this.isTargeting) {
            this.performArrowAttack(x, y);
            this.isTargeting = false;
            this.removeTargetingSprite();
        } 
        // If the player is not in targeting mode
        else {
            // make sure the click is inside the map
            if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                this.messageList.addMessage("Walking.");
                this.moveTo(x, y);
            }
        }
    }    
    //moving with arrow keys
    
    move(direction) {
        //console.log('Player is taking turn...');
        
        let [dx, dy] = this.getDeltaXY(direction);
        let [newTileX, newTileY] = [this.x + dx, this.y + dy];
        
        if (this.isOutOfBounds(newTileX, newTileY)) return;
        
        if (!this.isWalkableTile(newTileX, newTileY)) return;
        
        let door = Door.totalDoors().find(d => d.x === newTileX && d.y === newTileY);
        if (this.isLockedDoor(door)) return;
    
        if (door) {
            if (this.isOpenableDoor(door)) {
                // If the door can be opened, open it, but don't move player yet.

                door.open();
                playDoorSound();
            }
            // Now, move the player onto the door's tile, whether the door was already open or just opened.
            this.updatePosition(newTileX, newTileY);
            this.updateSprites(newTileX, newTileY);
            return;  // Exit after handling the door.
        }
    
        // Handle fire tile effects
        this.handleTileEffects(newTileX, newTileY, direction);
        
        // If the player did not attempt to enter fire or if they attempted and then changed direction, proceed with the move.
        if (!this.attemptingFireEntry || (this.attemptingFireEntry && this.fireEntryDirection !== direction)) {
            this.x = newTileX;
            this.y = newTileY;
            playFootstepSound();
            this.checkForItems(newTileX, newTileY);
            this.updateSprites();
        }
    }
    
    
    

    getDeltaXY(direction) {
        let dx = 0, dy = 0;
        switch (direction) {
            case 'up':
                dy = -1;
                break;
            case 'down':
                dy = 1;
                break;
            case 'left':
                dx = -1;
                break;
            case 'right':
                dx = 1;
                break;
            case 'up-left':
                dy = -1;
                dx = -1;
                break;
            case 'up-right':
                dy = -1;
                dx = 1;
                break;
            case 'down-left':
                dy = 1;
                dx = -1;
                break;
            case 'down-right':
                dy = 1;
                dx = 1;
                break;
        }
        return [dx, dy];
    }

    isOutOfBounds(x, y) {
        return x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT;
    }

    isWalkableTile(x, y) {
        return floorMap[y][x]?.value === 157;
    }

    isLockedDoor(door) {
        if (door && door.isLocked) {
            const keyItem = player.inventory.find(item => item.type === ItemType.KEY && item.id === door.id);
            if (keyItem) {
                door.unlock();
                player.removeItem(keyItem);
                sound.play('lock');
                messageList.addMessage(`You unlocked the ${door.name} door with your key.`);
                return false;
            } else {
                // Player doesn't have the right key
                messageList.addMessage(`The ${door.name} is locked.`);
                return true;
            }
        }
        return false;
    }

    isOpenableDoor(door) {
        return door && !door.isLocked && !door.isOpen;
    }

    handleTileEffects(newTileX, newTileY, direction) {
        // Check if player has changed direction after fire warning
        if (this.attemptingFireEntry && this.fireEntryDirection !== direction) {
            console.log("Direction changed after fire warning");
            this.attemptingFireEntry = false;
            this.fireEntryDirection = null;
        }
    
        let atmosphereTileValue = atmosphereMap[newTileY][newTileX]?.value;
        //console.log(`Checking fire at (${newTileX}, ${newTileY}): `, atmosphereTileValue);
        let floorTileValue = floorMap[newTileY][newTileX]?.value;
        let objectTileValue = objectMap[newTileY][newTileX]?.value;
    
        // If not attempting to enter the fire, reset fire entry-related flags
        if (atmosphereTileValue !== 300) {
            this.attemptingFireEntry = false;
            this.fireEntryDirection = null;
        }
    
        if (floorTileValue === 157 && (!objectTileValue && atmosphereTileValue != 300)) {
            this.x = newTileX;
            this.y = newTileY;
        } else if (atmosphereTileValue === 300 && !this.attemptingFireEntry) {  
            this.attemptingFireEntry = true;
            this.fireEntryDirection = direction;
            this.messageList.addMessage("Walk into the fire?");
        } else if (atmosphereTileValue === 300 && this.attemptingFireEntry && this.fireEntryDirection === direction) {
            this.x = newTileX;
            this.y = newTileY;
            this.isBurning = true;
            this.burningTurns = 0;
            this.messageList.addMessage("You stepped into fire!");
            this.attemptingFireEntry = false;
            this.fireEntryDirection = null;
        }
    }
    
    
    

    checkForItems(x, y) {
        let item = objectMap[y][x]?.item;
        if (item) this.pickUpItem(item, x, y);
    }

    updatePosition(newTileX, newTileY) {
        //console.log('update player position');
        this.prevX = this.x;
        this.prevY = this.y;
        this.x = newTileX;
        this.y = newTileY;
        
    }

    updateSprites(newTileX, newTileY) {
        this.sprite.footprint.x = this.x * TILE_WIDTH * SCALE_FACTOR;
        this.sprite.footprint.y = this.y * TILE_HEIGHT * SCALE_FACTOR;
        this.sprite.overlay.x = this.sprite.footprint.x;
        this.sprite.overlay.y = this.sprite.footprint.y - TILE_HEIGHT * SCALE_FACTOR;
    
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
                    if (uiMaskMap[y]?.[x]?.sprite) {
                        uiMaskMap[y][x].sprite.alpha = 1;
                    }
                }
            }
        }
        this.prevX = this.x;
        this.prevY = this.y;
        // Occlude nearby wall and UI sprites
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                let y = this.y + dy;
                let x = this.x + dx;
                //iterate over a 3x3 block of tiles around the player
                
                if (wallMap[y]?.[x]?.sprite && floorMap[y][x].value === 157) { //check for an occluding wall with floor behind it
                    createFloor(x,y);
                    wallMap[y][x].sprite.alpha = 0.4;
                } else if (wallMap[y]?.[x]?.sprite) { //for walls with no floor underneath that could occlude the player's sprite
                    wallMap[y][x].sprite.alpha = 0.4;
                    createSprite(x, y, {x: 16, y: 5}, backgroundMap, 216);
                }
    
                if (uiMaskMap[y]?.[x]?.sprite) {
                    uiMaskMap[y][x].sprite.alpha = 0.2;
                }
            }
        }
    }

    //we don't want implicit steps to be taken instantly, we want to see them
    delayedMove(direction, delay) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.move(direction);
                this.messageList.addDotToEndOfLastMessage();
                resolve();
            }, delay);
        });
    }
    //moveTo implicitly takes turns when the player clicks on a distant spot that can be walked to
    async moveTo(targetX, targetY) {
        if (targetX === this.x && targetY === this.y) return;

        let path = [];
        let stuckCounter = 0; // add a counter for stuck moves

        let passableCallback = (x, y) => {
            let floorTileValue = floorMap[y][x]?.value;
            let objectTileValue = objectMap[y][x]?.value;
            let atmosphereTileValue = atmosphereMap[y][x]?.value;
            // Tile is considered "unpassable" if it's on fire.
            if (atmosphereTileValue === 300) {
                return false;
            }
            return floorTileValue === 157 && (!objectTileValue);
        }

        let astar = new ROT.Path.AStar(targetX, targetY, passableCallback);

        let pathCallback = (x, y) => {
            path.push({ x, y });
        }

        astar.compute(this.x, this.y, pathCallback);

        if (path.length === 0) {
            this.messageList.addMessage("You're not sure how to get there.");
            return;
        }
    
        for (let point of path) {
            let { x, y } = point;
            if (this.isDead) {
                break;
            }
            if (this.canSeeMonster(Monster.allMonsters)) { 
                this.messageList.addMessage("You see a monster!");
                break;
            }
            let direction;
            if (x < this.x && y < this.y) {
                direction = 'up-left';
            } else if (x > this.x && y < this.y) {
                direction = 'up-right';
            } else if (x < this.x && y > this.y) {
                direction = 'down-left';
            } else if (x > this.x && y > this.y) {
                direction = 'down-right';
            } else if (x < this.x) {
                direction = 'left';
            } else if (x > this.x) {
                direction = 'right';
            } else if (y < this.y) {
                direction = 'up';
            } else if (y > this.y) {
                direction = 'down';
            }
    
            // Save old position
            let oldX = this.x;
            let oldY = this.y;
    
            await this.delayedMove(direction, 200);  // 200ms delay
            let door = Door.allDoors.find(door => door.x === x && door.y === y && !door.isLocked);
            if (door) {
                door.open();
            }
            // After each move, check if the position has changed
            if (this.x === oldX && this.y === oldY) {
                // Increase the stuckCounter if the position hasn't changed
                stuckCounter++;
    
                // If the player hasn't moved for 3 consecutive turns, assume it's stuck
                if (stuckCounter >= 3) {
                    this.messageList.addMessage("You can't move further in this direction.");
                    break;  // Break the loop
                }
            } else {
                // Reset the stuckCounter if the player has moved
                stuckCounter = 0;
            }
    
            if (this.engine._lock) {
                this.engine.unlock();
            }
        }
    }
    removeItem(item) {
        const index = this.inventory.indexOf(item);
        if (index !== -1) {
            this.inventory.splice(index, 1);
        }
    }
    isAdjacentTo(x, y) {
        return Math.abs(this.x - x) <= 1 && Math.abs(this.y - y) <= 1;
    }

    getAdjacentPosition(targetX, targetY) {
        let diffX = this.x - targetX;
        let diffY = this.y - targetY;
    
        if (diffX !== 0) diffX = diffX > 0 ? 1 : -1;
        if (diffY !== 0) diffY = diffY > 0 ? 1 : -1;
    
        return { x: targetX + diffX, y: targetY + diffY };
    }

    handleKeydown(event) {
        if (this.isDead) return;
        // If the player is in targeting mode, any keypress should cancel the targeting
        if (this.isTargeting) {
            this.isTargeting = false;
            this.messageList.addMessage("Shot cancelled.");
            this.removeTargetingSprite();
            return;
        }
        let newDirection = null;
        switch (event.key) {
            case 'ArrowUp':
            case 'Numpad8':
                newDirection = 'up';
                break;
            case 'ArrowDown':
            case 'Numpad2':
                newDirection = 'down';
                break;
            case 'ArrowLeft':
            case 'Numpad4':
                newDirection = 'left';
                break;
            case 'ArrowRight':
            case 'Numpad6':
                newDirection = 'right';
                break;
            case 'Numpad7':
                newDirection = 'up-left';
                break;
            case 'Numpad9':
                newDirection = 'up-right';
                break;
            case 'Numpad1':
                newDirection = 'down-left';
                break;
            case 'Numpad3':
                newDirection = 'down-right';
                break;
            default:
                messageList.addMessage('Time passes.');
                break;
        }
        
        if (newDirection) {
            this.move(newDirection);
        }
    
        if (this.engine._lock) {
            this.engine.unlock();  // After moving, unlock the engine for the next turn
        }
        if (event.key === 'a' || event.code === 'KeyA') {
            this.handleArrowAttack();
            console.log("arrow attack");
        }
        if (event.key === 'c' || event.code === 'KeyC') {
            this.handleCloseDoor();
            console.log("close door");
        }
    }
    
    handleArrowAttack() {
        const hasBow = this.inventory.some(item => item.type === ItemType.BOW);
        if (hasBow) {
            this.isTargeting = true;
            this.messageList.addMessage("Aim bow at?");
        }
    }

    performArrowAttack(targetX, targetY) {
        // Check if player has enough arrows
        if (this.arrows <= 0) {
            this.messageList.addMessage("You have no arrows left.");
            return;
        }
        
        // Draw a line from the player's position to the target's position
        let path = line({ x: this.x, y: this.y }, { x: targetX, y: targetY });
        
        let arrowX = this.x;
        let arrowY = this.y;
        let monsterHit = null;
        
        for (let point of path) {
            let x = point.x;
            let y = point.y;

            // Check if there's a wall or door at this point
            if (floorMap[y][x]?.value !== 157 || (doorMap[y] && doorMap[y][x])) {
                break;
            }

            // Check if there's a monster at this point
            /* let monster = // logic to find monster at (x, y) ;
            if (monster) {
                monsterHit = monster;
                arrowX = x;
                arrowY = y;
                break;
            } */

            // If not, then this is the new arrow position
            arrowX = x;
            arrowY = y;
        }
        
        // Create the arrow sprite at the final position
        setTimeout(function() {
            new Item(ItemType.ARROW,arrowX, arrowY, '0xFFFFFF', 2);
            engine.unlock();
        }, 700);
        

        // Decrement player's arrows by 1
        this.arrows--;
        
        if (monsterHit) {
            // Deal damage to the monster
            monsterHit.takeDamage(/* Damage amount */);
            this.messageList.addMessage("You hit the monster!");
            playArrowSound(true);
        } else {
            this.messageList.addMessage("You missed.");
            playArrowSound(false);
        } 
    }
    
    displayTargetingSprite(x, y) {
        this.targetingX = x;
        this.targetingY = y;
        createSprite(x, y, {x: 12, y: 8}, overlayMap);
    }
    
    removeTargetingSprite() {
        if (this.targetingX !== null && this.targetingY !== null) {
            createSprite(this.targetingX, this.targetingY, {x: 0, y: 0}, overlayMap); // Assuming {x: 0, y: 0} is empty
            this.targetingX = null;
            this.targetingY = null;
        }
    }
    handleCloseDoor() {

    }

    pickUpItem(item, x, y) {
        // Remove the item from the object map and the game container
        objectMap[y][x] = null;
        gameContainer.removeChild(item.sprite);
        playPickupSound();
        // Move the player to the item's position
        this.updatePosition(x, y); // Add this line to update the player's position
    
        // Add the item to the player's inventory
        if (item.type != ItemType.ARROW) {
            this.inventory.push(item);
        }
        if (item.type === ItemType.BOW || item.type === ItemType.ARROW) {
            this.arrows++;
        }

        // Log a message about the item picked up
        this.messageList.addMessage(`You picked up a ${item.name}.`);
    }

    applyDamageEffects() {
        if (this.isBurning) {
            this.blood -= 20;
            sound.play('ouch');
            this.burningTurns++;
            this.messageList.addMessage("You are on fire!");
            
            // Increase chance of burning ending after 4 turns, with a guarantee to stop after 6 turns
            if (this.burningTurns > 3 || (this.burningTurns > 3 && Math.random() < 0.5) || this.burningTurns > 5 && atmosphereMap[this.y][this.x].value != 300) {
                this.isBurning = false;
                this.messageList.addMessage("You are no longer on fire.");
            }
            if (Math.random() < 0.7) {
                let newY = this.y - 1; // the tile above the current one
                if (newY >= 0 && floorMap[newY][this.x].value !== 177 && atmosphereMap[newY][this.x] === null) {
                    let smoke = new Smoke(this.x, newY, this.scheduler);
                    this.scheduler.add(smoke, true);
                }
            }
        }
        if (atmosphereMap[this.y][this.x] == 400 && Math.random() < 0.7 && !this.isDead){
            this.messageList.addMessage("You cough through the thick smoke.");
            this.blood --;
        }
        if (this.blood < 1 && this.blood > -100 && this.isSkeletonized == false) {
            this.messageList.addMessage("You are dead!");
            this.type = PlayerType.SKELETON;
            this.isDead = true;
            this.isSkeletonized = true;
            
            this.skeletonize();
        }
        // Check if player is REALLY dead
        if (this.blood <=-100 && this.isSkeletonized == true) {
            this.type = PlayerType.PILE;
            this.isDead = true;
            this.incinerate();
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
    incinerate() {
        let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
        
        // Use player type to decide on sprites.
        let footprintPosition, headPosition;
        switch(this.type) {
            // Add your other cases here.
            case PlayerType.PILE:
                footprintPosition = {x: 7, y: 1};
                headPosition = {x: 0, y: 0}; 
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
        this.inspector.addMessage( "Name: " + this.name);
        this.inspector.addMessage( "Blood: " + this.blood);
        // Print inventory items
        if (this.inventory.length === 0) {
            this.inspector.addMessage("Inventory: Empty");
        } else {
            this.inspector.addMessage("Inventory:");
            for (let item of this.inventory) {
                this.inspector.addMessage("- " + item.name);
            }
        }
        this.inspector.addMessage( "Arrows: " + this.arrows);
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
    spriteFootprint.zIndex = 2.3;

    let overlayTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        player.headPosition.x * TILE_WIDTH, 
        player.headPosition.y * TILE_HEIGHT, 
        TILE_WIDTH, TILE_HEIGHT));
    let spriteOverlay = new PIXI.Sprite(overlayTexture);
    spriteOverlay.scale.set(SCALE_FACTOR);
    spriteOverlay.zIndex = 2.3;

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
        sound.play('fireball');
        messageList.addMessage("The {0} breathes flames!", [monster.name]);
    },
    // Add other attacks here
}

class Monster {
    static allMonsters = [];
    constructor(type, x, y, scheduler, engine, messageList, inspector) {
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
        this.inspector = inspector;
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
                        if (floorMap[y][x].value !== 157 || (doorMap[y] && doorMap[y][x])) {
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
                
                    // Filter out tiles that have a locked door.
                    adjacentTiles = adjacentTiles.filter(tile => {
                        let doorOnTile = Door.allDoors.find(door => door.x === tile.x && door.y === tile.y);
                        if (doorOnTile) {
                            if (doorOnTile.isLocked) {
                                return false;
                            }
                        }
                        return true;
                    });
                
                    if(adjacentTiles.length > 0) {
                        let randomTile = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)];
                        this.x = randomTile.x;
                        this.y = randomTile.y;
                
                        // Open any unlocked door on the tile.
                        let doorOnTile = Door.allDoors.find(door => door.x === this.x && door.y === this.y);
                        if (doorOnTile && !doorOnTile.isLocked && !doorOnTile.isOpen) {
                            doorOnTile.open();
                            messageList.addMessage("You hear a crashing noise.");
                        }
                
                        this.updateSpritePosition();
                    }
                };
                this.act = function() {
                    //console.log("Basilisk's turn");
                    if(!this.target) {
                        this.getTargetsInRange();
                    }
                    if(this.target) {
                        if (this.canSeeTarget(this.target)) {
                            //console.log("The Basilisk sees something!");
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

        Monster.allMonsters.push(this);
        
    }
    printStats() {
        this.inspector.clearMessages();
        this.inspector.addMessage( "Name: " + this.name);
        this.inspector.addMessage( "Blood: " + this.blood);
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
    spriteFirstTile.interactive = true;  // Make the sprite respond to interactivity
    spriteFirstTile.on('mouseover', () => {
        messageList.hideBox();  
        monster.printStats();  // Ensure there's a printStats method for Monster
        inspector.showBox();  
        inspector.render();  
    });

    spriteSecondTile.interactive = true;  
    spriteSecondTile.on('mouseover', () => {
        messageList.hideBox();  
        monster.printStats();  // Ensure there's a printStats method for Monster
        inspector.showBox();  
        inspector.render();  
    });

    spriteFirstTile.on('mouseout', () => {
        inspector.hideBox();
        messageList.showBox();
    });
    
    spriteSecondTile.on('mouseout', () => {
        inspector.hideBox();
        messageList.showBox();
    });

}

//this is for tinting fire
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
        this.name = "Fire";
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
        
        if (!atmosphereMap[this.y]) {
            atmosphereMap[this.y] = [];
        }
        atmosphereMap[this.y][this.x] = { value: 300, sprite: this.sprite };
        this.sprite.interactive = true;
        this.sprite.on('mouseover', () => {
            messageList.hideBox(); 
            this.showInspectorInfo();
            inspector.showBox();  
            inspector.render();  
        });
        this.sprite.on('mouseout', () => {
            inspector.hideBox();
            messageList.showBox();
        });
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
    showInspectorInfo() {
        if (objectMap[this.y] && objectMap[this.y][this.x] && objectMap[this.y][this.x].item) {
            // There's an Item at the same position on objectMap
            const item = objectMap[this.y][this.x].item;
            inspector.clearMessages();
            inspector.addMessage(`Burning ${item.name}`);
            inspector.showBox();  
            inspector.render();
        } else {
            inspector.clearMessages();
            inspector.addMessage(`${this.name}`); 
        }
    };

    act() {
        //createjs.Tween.tick();
        // Decrease turns left, if it reaches 0, stop spreading and destroy the sprite
        //console.log("fire turn");
        if (--this.turnsLeft <= 0) {
            this.sprite.destroy();
            this.scheduler.remove(this);
            atmosphereMap[this.y][this.x] = null;
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
                    (!atmosphereMap[newY][newX] || atmosphereMap[newY][newX].value !== 300 && doorMap[newY][newX].value !== 100)) {
                
                    let fire = new Fire(newX, newY, this.scheduler, '0xFFCC33');
                    atmosphereMap[newY][newX].value = 300;
                                    
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
            if (newY >= 0 && floorMap[newY][this.x].value !== 177 && atmosphereMap[newY][this.x] === null) {
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
        this.name = "Smoke";
        this.sprite = new PIXI.AnimatedSprite(smokeFrames); // Replace fireFrames with smokeFrames
        this.sprite.animationSpeed = 0.1;
        this.sprite.loop = true;
        this.sprite.play();
        this.sprite.position.set(x * TILE_WIDTH * SCALE_FACTOR, y * TILE_HEIGHT * SCALE_FACTOR); 
        this.sprite.scale.set(SCALE_FACTOR); 
        this.sprite.zIndex = 2.5;  // Making sure smoke appears below fire, adjust as needed
        gameContainer.addChild(this.sprite);
        atmosphereMap[this.y][this.x] = 400;
        this.sprite.interactive = true;
        this.sprite.on('mouseover', () => {
            messageList.hideBox(); 
            this.showInspectorInfo();
            inspector.showBox();  
            inspector.render();  
        });
        this.sprite.on('mouseout', () => {
            inspector.hideBox();
            messageList.showBox();
        });
        
    }

    showInspectorInfo() {
        inspector.clearMessages();
        inspector.addMessage(`${this.name}`);
    }
    act() {
        // 50% chance to disappear
        if (Math.random() < 0.5) {
            
            // Remove from object map
            atmosphereMap[this.y][this.x] = null;

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

//items

let CanBePickedUp = {
    pickup: function(player) {
        player.addItem(this);
        // Remove the item from the map or its container
    }
}

const ItemType = Object.freeze({
    "FOOD": 0,
    "BOW": 1,
    "KEY": 2,
    "ARROW": 3
});

class Item {
    constructor(type, x, y, id, colorValue, name) {
        this.x = x;
        this.y = y;
        this.colorValue = colorValue;
        this.id = id;
        this._tileIndex = {x: 17, y: 2};
        this.isFlammable = false;
        switch (type) {
            case ItemType.BOW:
                this._name = 'Bow';
                this._type = type;
                this._tileIndex = {x: 13, y: 0};  // the tile indices on the spritesheet for the Bow
                this._objectNumber = 1; // I was using this as a value for objectMap for game logic
                break;
            case ItemType.KEY:
                this._name = `${name}`;
                this._type = type;
                this._tileIndex = {x: 10, y: 0};
                this._objectNumber = 105;
                this.id = id; // The key's unique identifier
                this.colorValue = colorValue; // The key's color value
                break;
            case ItemType.ARROW:
                this._name = 'Arrow';
                this._type = type;
                this._tileIndex = {x: 3, y: 1};
                this._objectNumber = 2;
                break;
        }
        let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
        this.spriteTexture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
            this._tileIndex.x * TILE_WIDTH, 
            this._tileIndex.y * TILE_HEIGHT, 
            TILE_WIDTH, 
            TILE_HEIGHT
        ));
        this.sprite = new PIXI.Sprite(this.spriteTexture);
        this.sprite.interactive = true;
        this.sprite.on('mouseover', () => {
            messageList.hideBox(); 
            this.showInspectorInfo();
            inspector.showBox();  
            inspector.render();  
        });
        this.sprite.on('mouseout', () => {
            inspector.hideBox();
            messageList.showBox();
        });
        if (type === ItemType.KEY) {
            this.sprite.tint = this.colorValue;
        }

        // Set position, scale, and zIndex of the sprite
        this.sprite.position.set(x * TILE_WIDTH * SCALE_FACTOR, y * TILE_HEIGHT * SCALE_FACTOR);
        this.sprite.scale.set(SCALE_FACTOR);
        this.sprite.zIndex = 2;

        // Add sprite to gameContainer
        gameContainer.addChild(this.sprite);

        if (!objectMap[this.y]) {
            objectMap[this.y] = [];
        }
        objectMap[this.y][this.x] = { value: this._objectNumber, sprite: this.sprite, item: this };
    }

    get name() {
        return this._name;
    }

    get type() {
        return this._type;
    }

    get tile() {
        return this._tile;
    }

    showInspectorInfo() {
        inspector.clearMessages();
        inspector.addMessage(`${this.name}`);
        
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


class Door {
    static allDoors = [];
    constructor(id, x, y, colorValue, isLocked = false) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.colorValue = colorValue;
        this.name = ''; 
        this.isLocked = isLocked;
        this.isOpen = false;
        this.sprites = []; // This will hold the three parts of the door
        this.createDoor();
        Door.allDoors.push(this);
    }

    static totalDoors() {
        //return Door.allDoors.length;
        return Door.allDoors;
    }

    createDoor() {
        const closedSpriteIndices = [{x: 11, y: 6}, {x: 10, y: 6}, {x: 21, y: 8}];
        const openSpriteIndices = [{x: 13, y: 8}, {x: 13, y: 8}, {x: 21, y: 9}];

        const spriteIndices = this.isOpen ? openSpriteIndices : closedSpriteIndices;

        // Create door parts on the object map
        for (let i = 0; i < spriteIndices.length; i++) {
            createSprite(this.x, this.y - i, spriteIndices[i], doorMap, this.isLocked ? 101 : 100);
            let sprite = doorMap[this.y - i][this.x].sprite;
            this.sprites.push(sprite);

            // Interactivity
            sprite.interactive = true;
            sprite.on('mouseover', () => {
                messageList.hideBox(); 
                this.showInspectorInfo();
                inspector.showBox();  
                inspector.render();  
            });

            sprite.on('mouseout', () => {
                inspector.hideBox();
                messageList.showBox();
            });

            sprite.on('click', () => {
                if (player && player.isAdjacentTo(this.x, this.y)) {
                    // Check if door is locked and if player has the right key
                    if (this.isLocked) {
                        const keyItem = player.inventory.find(item => item.type === ItemType.KEY && item.id === this.id);
                        if (keyItem) {
                            this.unlock();
                            player.removeItem(keyItem); // Assuming the Player class has a removeItem method
                            messageList.addMessage(`You unlocked the ${this.name} door with your key.`);
                        } else {
                            // Player doesn't have the right key
                            messageList.addMessage(`The ${this.name} is locked.`);
                            return;
                        }
                    }
                    this.toggleDoor();
                } else if (player) {
                    let adjacentPosition = player.getAdjacentPosition(this.x, this.y);
                    player.moveTo(adjacentPosition.x, adjacentPosition.y).then(() => {
                        // Once the player has moved adjacent to the door, toggle it
                        this.toggleDoor();
                    });
                }
            });
        }

        // Apply color tint
        if (this.isLocked) {
            this.sprites.forEach(sprite => sprite.tint = this.colorValue);
        }
    }

    lock() {
        this.isLocked = true;
        this.updateDoorStateInMap(101); // Update the object map value to represent locked door
    }

    unlock() {
        if (this.isLocked) {
            this.isLocked = false;
            this.updateDoorStateInMap(100); // Update the object map value to represent unlocked door
            this.open();
        }
    }

    isDoorLocked() {
        return this.isLocked;
    }

    canUnlock(key) {
        return key.id === this.id;
    }
    toggleDoor() {
        if (this.isOpen) {
            this.close();
            messageList.addMessage("You close a door.")
            this.updateDoorStateInMap(100);
            playDoorSound();
        } else {
            this.open();
            messageList.addMessage("You open a door.")
            this.updateDoorStateInMap(null);
            playDoorSound();
        }
    }
    open() {
        if (!this.isLocked && !this.isOpen) {
            const openSpriteIndices = [{x: 13, y: 8}, {x: 13, y: 8}, {x: 21, y: 9}];
            this.updateSprites(openSpriteIndices);
            this.isOpen = true;
            playDoorSound();
        }
    }

    close() {
        if (!this.isLocked && this.isOpen) {
            const closedSpriteIndices = [{x: 11, y: 6}, {x: 10, y: 6}, {x: 21, y: 8}];
            this.updateSprites(closedSpriteIndices);
            this.isOpen = false;
        }
    }

    updateSprites(spriteIndices) {
        for (let i = 0; i < this.sprites.length; i++) {
            this.sprites[i].texture = getTextureFromIndices(spriteIndices[i]);
        }
    }

    updateDoorStateInMap(value) {
        for (let i = 0; i < 3; i++) {
            doorMap[this.y - i][this.x].value = value;
        }
    }

    showInspectorInfo() {

        inspector.clearMessages();
        if(this.isOpen) {
            if (!player.isDead){
                inspector.addMessage("Close door?");
            }
        } else {
            if (this.isLocked) {
                inspector.addMessage(`${this.name}`);
            }   else {
                inspector.addMessage(`Door`);
            }
            inspector.addMessage(`Status: ${this.isLocked ? "Locked" : "Unlocked"}`);
        }
    }

}


// Mixin CanBePickedUp into Item
Object.assign(Item.prototype, CanBePickedUp);


// This function advances the turn after a delay of 1/2 second
function delayedAdvanceTurn() {
    
    setTimeout(function() {
        engine.unlock();
    }, 200);
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
            messageList.addMessage("Time passes.");
            if (engine._lock){
                delayedAdvanceTurn();
                player.blood -= 1;
                messageList.addDotToEndOfLastMessage();
                player.applyDamageEffects();
            }
        }
    }
}

function getTextureFromIndices(index) {
    let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
    let texture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        index.x * TILE_WIDTH,
        index.y * TILE_HEIGHT,
        TILE_WIDTH, TILE_HEIGHT));

    return texture;
}

function createSprite(x, y, index, layer, value = null) {
    if (!layer[y]) {
        layer[y] = [];
    }
    let container;
    if (layer === uiMaskMap){
        container = uiMaskContainer;
    } else if (layer === uiMap || layer === overlayMap) {
        container = uiContainer;
    } else {
        container = gameContainer;
    }
    if (layer?.[y]?.[x]?.sprite) {
        container.removeChild(layer[y][x].sprite);
    }

    

    let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
    let texture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(
        index.x * TILE_WIDTH,
        index.y * TILE_HEIGHT,
        TILE_WIDTH, TILE_HEIGHT));

    let sprite = new PIXI.Sprite(texture);
    sprite.scale.set(SCALE_FACTOR);
    sprite.x = x * TILE_WIDTH * SCALE_FACTOR;
    sprite.y = y * TILE_HEIGHT * SCALE_FACTOR;

    // Set initial opacity to 1
    if (layer === wallMap || layer === uiMap) {
        sprite.alpha = 1;
    }
    if (layer === atmosphereMap){
        sprite.zIndex = 3.9;
    }
    if (layer === wallMap) {
        sprite.zIndex = 3;

        // Remove sprites on layers beneath the wall layer if they exist at the same position
        if (wallMap?.[y]?.[x]?.sprite) {
            container.removeChild(wallMap[y][x].sprite);
            wallMap[y][x].sprite = null;
        }
        if (floorMap?.[y]?.[x]?.sprite) {
            container.removeChild(floorMap[y][x].sprite);
            floorMap[y][x].sprite = null;
        }
        if (backgroundMap?.[y]?.[x]?.sprite) {
            container.removeChild(backgroundMap[y][x].sprite);
            backgroundMap[y][x].sprite = null;
        }
    } else if (layer === objectMap || layer === doorMap) {
        sprite.zIndex = 2; // Set zIndex for objectMap
    } else if (layer === floorMap) {
        sprite.zIndex = 1;
        
        // Remove sprites on the background layer if they exist at the same position
        if (backgroundMap?.[y]?.[x]?.sprite) {
            container.removeChild(backgroundMap[y][x].sprite);         
        }
    }

    container.addChild(sprite);

    let existingValue = layer[y][x] ? layer[y][x].value : null;
    layer[y][x] = {value: value !== null ? value : existingValue, sprite: sprite};

    // Update zIndex for objectMap based on y position compared to walls
    if (layer === objectMap || layer === doorMap && wallMap?.[y]?.[x]?.sprite) {
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

function createChasmWall(x, y) {
    createSprite(x, y, {x: 16, y: 7}, backgroundMap, 177);

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
    createSprite(x, y, {x: 22, y: 8}, floorMap, 177); // footprint
    createSprite(x, y - 1, {x: 22, y: 8}, wallMap, 177); // middle
    createSprite(x, y - 2, {x: 21, y: 8}, wallMap, 131); // top
}

function createVerticalWall(x, y) {
    if (wallMap[y][x] !== 131 && wallMap[y][x] !== 177){
        createSprite(x, y, {x: 22, y: 8}, floorMap, 177); // footprint
        createSprite(x, y - 1, {x: 22, y: 8}, wallMap, 177); // middle
    }
    createSprite(x, y - 2, {x: 16, y: 5}, wallMap, 131); // top
}


// dungeon generator
function dungeonGeneration() {
    // Use rot.js to create a uniform dungeon map
    dungeon = new ROT.Map.Uniform(MAP_WIDTH, MAP_HEIGHT);
    
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

async function addDoors() {
    // Fetch colors.json and store the colors array
    const response = await fetch('./assets/colors.json');
    const data = await response.json();
    const colors = data.colors;

    const rooms = dungeon.getRooms();
    const treasureRoomIndex = Math.floor(Math.random() * rooms.length);
    const treasureRoom = rooms[treasureRoomIndex];

    currentTreasureRoom = treasureRoom; //save the treasure room for later

    treasureRoom.getDoors((x, y) => {
        const colorIndex = Math.floor(Math.random() * colors.length); 
        const colorValue = parseInt(colors[colorIndex].hex.slice(1), 16);
        let door = new Door(globalDoorCounter++, x, y, colorValue, true);  // Locked door with unique ID
        door.name = capitalizeFirstLetter(colors[colorIndex].color) + " door ";
        placeKeyForDoor(door, colors[colorIndex].color);  // Add a key for this door
    });
    
    for (let i = 0; i < rooms.length; i++) {
        if (i !== treasureRoomIndex) {  // Skip the treasure room
            const room = rooms[i];
            room.getDoors((x, y) => {
                if (Math.random() >= 0.5) {  // 50% chance for a door
                    const colorIndex = Math.floor(Math.random() * colors.length); 
                    const colorValue = parseInt(colors[colorIndex].hex.slice(1), 16);
                    new Door(globalDoorCounter++, x, y, colorValue);  // Unlocked door with unique ID
                }
            });
        }
    }
    return treasureRoom;
}


function isTileInTreasureRoom(tile, treasureRoom) {
    if (!currentTreasureRoom) {
        return false;
    }

    return tile.x >= currentTreasureRoom.getLeft() && tile.x <= currentTreasureRoom.getRight() &&
           tile.y >= currentTreasureRoom.getTop() && tile.y <= currentTreasureRoom.getBottom();
}


function isTileWithDoor(tile, doorMap) {
    // Check if there's any door at the given tile's coordinates
    return doorMap[tile.y][tile.x] !== null && doorMap[tile.y][tile.x] !== undefined;
}
function placeKeyForDoor(door, doorName) {
    let walkableTiles = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (floorMap[y][x].value === 157) {
                walkableTiles.push({x: x, y: y});
            }
        }
    }
    let randomTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];

    let keyName = `${doorName} key`;
    new Item(ItemType.KEY, randomTile.x, randomTile.y, door.id, door.colorValue, keyName);

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
    //console.log("adding shadows");
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
                        createChasmWall(xPos,y);
                        xPos++; // Move to the next tile to the right
                    }
                }
            }
            
        }
    }
}

function evaluateMapAndCreateWalls() {
    // Loop through each row
    addDoors(dungeon);
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
        //const WHITE_TILE = { x: 21, y: 7};

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
    showUIContainer() {
        //console.log("I thought I turned on the UI Mask");
        createjs.Tween.get(uiMaskContainer).to({alpha: 1}, 100) // fade in
        .call(() => {
            uiContainerShown = true;
        });
        uiMaskContainer.alpha = 1;
    }
    
    hideUIContainer() {
        createjs.Tween.get(uiMaskContainer).to({alpha: 0}, 600) // fade out
        .call(() => {
            uiContainerShown = false;
        });
    }
    showBox() {
        if (!uiContainerShown) {
            this.showUIContainer();
        }
        this.hidden = false;
        this.drawUIBox();
    }

    hideBox() {
        this.hidden = true;
        this.clearBox();
    }

    toggleVisibility() {
        this.hidden = !this.hidden;
        if(this.hidden) {
            this.hideBox();
        } else {
            this.showBox();
        }
    }
    // Adds a message to the list
    addMessage(template, parameters = []) {
        if (!uiContainerShown) {
            this.showUIContainer();
        }
        let message = template;
        for(let i = 0; i < parameters.length; i++) {
            message = message.replace(`{${i}}`, parameters[i]);
        }
        this.clearText();
        this.textBuffer.push(message);
        this.render();
    }
    addDotToEndOfLastMessage() {
        let lastMessageIndex = this.textBuffer.length - 1;
    
        if (lastMessageIndex >= 0) {
            let lastMessage = this.textBuffer[lastMessageIndex];
            if (lastMessage.length < this.width - 2) { // -2 to leave space for the borders
                this.textBuffer[lastMessageIndex] += ".";
                this.render();
            }
        }
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

    render() {
        this.drawUIBox();
        if (!this.hidden && this.textBuffer.length > 0) {
            this.clearText();
            this.maskBox();
            const BLANK_TILE = { x: 0, y: 0 };
            const lastMessages = this.textBuffer.slice(-this.height + 2);
            for(let i = 0; i < lastMessages.length; i++) {
                let message = lastMessages[i];
                let y = 2 + i;
                for(let j = 0; j < this.width - 2; j++) { // Leave space for the border
                    let spriteLocation;
                    if (j < message.length) {
                        spriteLocation = this.charToSpriteLocation(message.charAt(j));
                    } else {
                        spriteLocation = BLANK_TILE;  // if it's after the end of the message, it's a blank tile
                    }
                    createSprite(j + 1, y, spriteLocation, uiMap, j < message.length ? message.charCodeAt(j) : 0);
                }
            }
            while (this.textBuffer.length > this.height - 2) {
                this.textBuffer.shift();
            }
        }
    }
}
// This function will run when the spritesheet has finished loading
function setup() {
    dungeonGeneration();
    addFloorsAndVoid();
    evaluateMapAndCreateWalls();
    addBaseAndShadows();    
    let walkableTiles = [];
    let publicTiles = []

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (floorMap[y][x].value === 157) {
                walkableTiles.push({x: x, y: y});
                let tile = {x: x, y: y};
    
                // If the tile is neither in the treasure room nor has a door, then it's public
                if (!isTileInTreasureRoom(tile, currentTreasureRoom)) {
                    publicTiles.push({x: tile.x,y: tile.y});
                } 
            }
        }
    }
    
    console.log(publicTiles.length);
    let randomTile = publicTiles[Math.floor(Math.random() * publicTiles.length)];

    let randomTile2 = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];

    let randomTile3 = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
    let randomTile4 = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
    messageList = new UIBox(["Welcome to the Dungeon of Doom!"], MAP_WIDTH, 5);
    inspector = new UIBox([], 30, 10, true);

    // And handle them individually
    messageList.showBox();
    messageList.showUIContainer();

    PIXI.Loader.shared.onComplete.add(() => {
        for (let i = 0; i < 7; i++) { // assuming you have 4 frames of fire animation
            let rect = new PIXI.Rectangle(i * TILE_WIDTH, 0, TILE_WIDTH, TILE_HEIGHT);
            let texture = new PIXI.Texture(PIXI.Loader.shared.resources.fire.texture.baseTexture, rect);
            fireFrames.push(texture);
        }

        let scheduler = new ROT.Scheduler.Simple();
        engine = new ROT.Engine(scheduler);
        player = new Player(PlayerType.HUMAN, randomTile.x, randomTile.y, scheduler, engine, messageList, inspector);
        createPlayerSprite(player);
        scheduler.add(player, true); // the player takes turns

        let basilisk = new Monster(MonsterType.BASILISK, randomTile2.x, randomTile2.y, scheduler, engine, messageList, inspector);
        createMonsterSprite(basilisk);
        scheduler.add(basilisk, true);
        new Item(ItemType.BOW,randomTile3.x, randomTile3.y, '0xFFFFFF', 1);
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