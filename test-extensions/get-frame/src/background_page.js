import { meta, init } from '../../../core';

init({
  log: true,
  actions: {
    FRAME: (arg, src) => meta(src).frameId
  }
});
