import { init, msg } from '../../../client';

// Inject Counter GUI into topright of page
const counter = document.createElement('div');
counter.setAttribute('style', 'z-index: 99999; position: fixed; top: 0; right: 0;');
counter.innerHTML = '<button id="increment">Increment</button><input id="count" disabled/>';
document.body.appendChild(counter);

init({
  log: true,
  subscriptions: ['count'],
  onConnect: [{ action: 'COUNT' }],
  actions: {
    NEW_COUNT: (count) => {
      document.getElementById('count').value = count;
    }
  }
});

// Add Click listener to increment count
document.getElementById('increment').addEventListener('click', () => {
  msg(1, 'INCREMENT');
});
