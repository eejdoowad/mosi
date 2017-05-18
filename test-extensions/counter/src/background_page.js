import { init, msg } from '../../../core';

let count = 0;

init({
  log: true,
  actions: {
    INCREMENT: (increment = 1) => {
      count += increment;
      msg('count', 'NEW_COUNT', count);
    },
    COUNT: (_, src) => {
      msg(src, 'NEW_COUNT', count);
    }
  }
});
