import { init, net } from 'mosi/lib/bp';

let count = 0;

const actions = (src) => ({
  INCREMENT: (increment = 1) => {
    count += increment;
    net('count').msg('NEW_COUNT', count);
  },
  COUNT: () => {
    net(src).msg('NEW_COUNT', count);
  }
});

init(actions);
