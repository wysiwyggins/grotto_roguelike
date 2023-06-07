//const { createPlayerSprite, movePlayer } = require('./player.js');
//const { createFloor, createWall, createTransparentVerticalWall, createTransparentWall, createRoom, createSimpleHallway } = require('./map.js');
//const { createMonsterSprite, moveMonsterSprite } = require('./sprites.js');


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

module.exports = { createPlayerSprite, movePlayer };