import { con, init } from 'mosi/core';

init({
  actions: {
    FRAME: (arg, src) => con(src).frameId
  }
});
