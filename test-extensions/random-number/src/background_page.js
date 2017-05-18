import { init } from '../../../core';

init({
  log: true,
  actions: {
    RANDOM: () => Math.floor(Math.random() * 100)
  }
});
