import { init, net } from 'mosi/lib/bp';

let global_links = 0;

init({
  actions: {
    NEW_PAGE: (links) => {
      global_links += links;
      net('links').msg('LINKS', global_links);
    },
    CLOSE_PAGE: (links) => {
      global_links -= links;
      net('links').msg('LINKS', global_links);
    }
  }
});
