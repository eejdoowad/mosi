import { init } from 'mosi/core';

init({
  actions: {
    FRAME: (arg, src, { frameId }) => frameId
  }
});
