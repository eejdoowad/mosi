```javascript
import { init, net, src } from 'mosi/bp';

let count = 0;

init({
  actions: (src) => ({
    INCREMENT: (increment = 1) => {
      count += increment;
      net('count').msg('NEW_COUNT', count);
    },
    COUNT: () => {
      net(src).msg('NEW_COUNT', count);
    }
  }
});
```

## content_script.js

```javascript
import { init, net } from 'mosi/cs';

// Inject Counter GUI into topright of page
const counter = document.createElement('div');
counter.setAttribute('style', 'z-index: 99999; position: fixed; top: 0; right: 0;');
counter.innerHTML = '<button id="increment">Increment</button><input id="count" disabled/>';
document.body.appendChild(counter);

init({
  subscriptions: ['count']
  onConnect: [{ action: 'COUNT' }]
  actions: {
    NEW_COUNT: (count) => {
      document.getElementById('count').value = count;
    }
  }
});

// Add Click listener to increment count
document.getElementById('increment').addEventListener('click', () => {
  net('bp').msg('INCREMENT');
});
```