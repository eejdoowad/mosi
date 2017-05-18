import { init } from '../../../core';

init({
  log: true,
  actions: {
    RANDOM: (count) => Math.floor(Math.random() * 100)
  }
});
