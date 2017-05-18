import { init, msg, meta } from '../../../core';

let global_links = 0;

init({
  log: true,
  actions: {
    NEW_PAGE: (links, src) => {
      meta(src).data.links = links;
      global_links += links;
      msg('links', 'LINKS', global_links);
    },
    LINKS_CHANGE: (change, src) => {
      meta(src).data.links += change;
      global_links += change;
      msg('links', 'LINKS', global_links);
    },
    CLOSE_PAGE: (__, src) => {
      global_links -= meta(src).data.links;
      msg('links', 'LINKS', global_links);
    }
  }
});
