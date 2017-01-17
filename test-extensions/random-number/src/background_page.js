import { init } from 'mosi/core';

init({
  actions: {
    RANDOM: () => Math.floor(Math.random() * 100)
  }
});
