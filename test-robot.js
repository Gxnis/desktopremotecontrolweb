const robot = require('robotjs');

console.log('Testing robot.js...');
console.log('Screen size:', robot.getScreenSize());

// Test mouse movement
console.log('Moving mouse to position 100, 100...');
robot.moveMouse(100, 100);

setTimeout(() => {
  console.log('Moving mouse to position 500, 500...');
  robot.moveMouse(500, 500);
}, 1000);

setTimeout(() => {
  console.log('Testing left click...');
  robot.mouseClick('left');
}, 2000);

setTimeout(() => {
  console.log('Test complete');
  process.exit(0);
}, 3000);
