import { init, get } from 'mosi/client';

// Inject Counter GUI into topright of page
const counter = document.createElement('div');
counter.setAttribute('style', 'z-index: 99999; position: fixed; top: 0; right: 0;');
counter.innerHTML = '<button id="rbutton">Increment</button><input id="random" disabled/>';
document.body.appendChild(counter);

init({
  actions: {
    RANDOM: (count) => Math.floor(Math.random() * 100)
  }
});

const updateRandom = async () => {
  const [{v: rand}] = await get(0, 'RANDOM');
  document.getElementById('random').value = rand;
};
updateRandom();
document.getElementById('rbutton').addEventListener('click', updateRandom);
