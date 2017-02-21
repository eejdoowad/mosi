import { msg } from 'mosi/light-client';

// Inject Counter GUI into topright of page
const counter = document.createElement('div');
counter.setAttribute('style', 'z-index: 99999; position: fixed; top: 0; right: 0;');
counter.innerHTML = `
<button id="increment">Send Random Number</button>
<p>Check the background page's console.</p>`;
document.body.appendChild(counter);

// Add Click listener to increment count
document.getElementById('increment').addEventListener('click', () => {
  const randomNumber = Math.floor(Math.random() * 100);
  msg(1, 'RANDOM', randomNumber);
});
