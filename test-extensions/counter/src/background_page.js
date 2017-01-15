import { init, msg } from 'mosi/core';

let count = 0;

init({
  actions: {
    INCREMENT: (increment = 1) => {
      count += increment;
      msg('count', 'NEW_COUNT', count);
    },
    COUNT: (__, src) => {
      msg(src, 'NEW_COUNT', count);
    }
  }
});
