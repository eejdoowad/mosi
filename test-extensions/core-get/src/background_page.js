import { init } from 'mosi/core';

init({
  actions: {
    RANDOM: (count) => Math.floor(Math.random() * 100)
  }
});
