import { init, net } from 'mosi/lib/cs';

// Inject Counter GUI into topright of page
const counter = document.createElement('div');
counter.setAttribute('style', 'z-index: 99999; position: fixed; top: 0; right: 0;');
counter.innerHTML = '<button id="increment">Increment</button><input id="count" disabled/>';
document.body.appendChild(counter);

document.getElementById('increment').addEventListener('click', () => {
  net('bp').msg('INCREMENT');
});

// Setup Mosi
const actions = (src) => ({
  NEW_COUNT: (count) => {
    document.getElementById('count').value = count;
  }
});

const subscriptions = ['count'];

init(actions, subscriptions);

// Get initial count
net('bp').msg('COUNT');
