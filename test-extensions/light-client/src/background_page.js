import { init } from '../../../core';


init({
  log: true,
  actions: {
    RANDOM: (random) => {
      console.log('Received ' + random);
    }
  }
});
