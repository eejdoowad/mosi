import { init, net } from 'mosi/lib/bp';

let count = 0;

const actions = (src) => ({
  INCREMENT: (increment = 1) => {
    count += increment;
    net('count').msg('COUNT', count);
  },
  COUNT: () => {
    net(src).msg('COUNT', count);
  }
});

init(actions);
