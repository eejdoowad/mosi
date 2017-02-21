import { init, get } from 'mosi/client';

// Inject Counter GUI into topright of page
const counter = document.createElement('div');
counter.setAttribute('style', 'z-index: 99999; position: fixed; top: 0; right: 0;');
counter.innerHTML = '<button id="rbutton">Random!</button><input id="random" disabled placeholder="Hit Random!"/>';
document.body.appendChild(counter);

init({});

document.getElementById('rbutton').addEventListener('click', async () => {
  const [{v: random}] = await get(1, 'RANDOM');
  document.getElementById('random').value = random;
});
