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
  UPDATE_LINKS: (count) => {
    document.getElementById('global_links').value = count;
  }
});

const subscriptions = ['links'];

const events = {
  connect: {
    action: UPDATE_LINKS
  },
  disconnect: {
    action: UPDATE_LINKS
  }
};

init(actions, subscriptions, events);

// Get initial count
net('bp').msg('COUNT');
