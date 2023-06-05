// Create a new Pixi Application
let app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0xFFFFFF 
});

// Add the app view to our HTML document
document.getElementById('game').appendChild(app.view);

// Set up some constants
const TILE_WIDTH = 40;
const TILE_HEIGHT = 30;
const SPRITESHEET_PATH = 'assets/spritesheets/grotto40x30-cp437.png';
const SCALE_FACTOR = 0.5; // Scaling factor for HiDPI displays
const SPRITE_POSITION = 5; // Position of the sprite (in tiles)

// Load the spritesheet using the global PIXI.Loader object
PIXI.Loader.shared.add('tiles', SPRITESHEET_PATH).load(setup);

// This function will run when the spritesheet has finished loading
function setup() {
    // Create a Texture from the specific tile you want to use
    let baseTexture = PIXI.BaseTexture.from(PIXI.Loader.shared.resources.tiles.url);
    let charX = 1; // X position (in tiles) of the character in the spritesheet
    let charY = 0; // Y position (in tiles) of the character in the spritesheet
    let texture = new PIXI.Texture(baseTexture, new PIXI.Rectangle(charX * TILE_WIDTH, charY * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT));

    // Create a new Sprite from the texture
    let sprite = new PIXI.Sprite(texture);

    // Position the sprite
    sprite.x = SPRITE_POSITION * TILE_WIDTH * SCALE_FACTOR; // Scale the position for HiDPI
    sprite.y = SPRITE_POSITION * TILE_HEIGHT * SCALE_FACTOR; // Scale the position for HiDPI

    // Scale down the sprite size for HiDPI
    sprite.scale.set(SCALE_FACTOR);

    // Add the sprite to the stage
    app.stage.addChild(sprite);

    // Listen for keyboard input
    window.addEventListener("keydown", function(event) {
        switch(event.key) {
            case 'ArrowUp':
                sprite.y -= TILE_HEIGHT * SCALE_FACTOR;
                break;
            case 'ArrowDown':
                sprite.y += TILE_HEIGHT * SCALE_FACTOR;
                break;
            case 'ArrowLeft':
                sprite.x -= TILE_WIDTH * SCALE_FACTOR;
                break;
            case 'ArrowRight':
                sprite.x += TILE_WIDTH * SCALE_FACTOR;
                break;
            default:
                break;
        }
    });
}
