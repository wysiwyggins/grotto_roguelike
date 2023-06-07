const PIXI = require('pixi.js');
//const { createPlayerSprite, movePlayer } = require('./player.js');
const { createFloor, createWall, createTransparentVerticalWall, createTransparentWall, createRoom, createSimpleHallway } = require('./map.js');
//const { createMonsterSprite, moveMonsterSprite } = require('./sprites.js');


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

module.exports = { createFloor, createWall, createTransparentVerticalWall, createTransparentWall, createRoom, createSimpleHallway };