import { init, get } from '../../../client';

// Inject Counter GUI into topright of page
const counter = document.createElement('div');
counter.setAttribute('style', 'z-index: 99999; position: fixed; top: 0; right: 0;');
counter.innerHTML = '<label>Frame: <input id="random" disabled/></label>';
document.body.appendChild(counter);

init({
  log: true
});

const getFrame = async () => {
  const [{v: frame}] = await get(1, 'FRAME');
  document.getElementById('random').value = frame;
};
getFrame();
