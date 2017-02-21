import { init } from 'mosi/core';


init({
  actions: {
    RANDOM: (random) => {
      console.log('Received ' + random);
    }
  }
});
