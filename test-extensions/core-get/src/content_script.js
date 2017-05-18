import { init, get } from '../../../client';

// Inject Counter GUI into topright of page
const counter = document.createElement('div');
counter.setAttribute('style', 'z-index: 99999; position: fixed; top: 0; right: 0;');
counter.innerHTML = '<button id="rbutton">Random</button><input id="random" disabled/>';
document.body.appendChild(counter);

init({ log: true });

const updateRandom = async () => {
  const [{v: rand}] = await get(1, 'RANDOM');
  document.getElementById('random').value = rand;
};
updateRandom();
document.getElementById('rbutton').addEventListener('click', updateRandom);
