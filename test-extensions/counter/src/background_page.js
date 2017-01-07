import { init, net, src } from 'mosi/lib/bp';

let count = 0;

init({
  actions: {
    INCREMENT: (increment = 1) => {
      count += increment;
      net('count').msg('NEW_COUNT', count);
    },
    COUNT: () => {
      net(src()).msg('NEW_COUNT', count);
    }
  }
});
