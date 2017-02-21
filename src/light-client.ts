import { Destination } from './node';

/**
 * A lightweight, limited, msg implementation. Light-clients don't support
 * response handling thus the loop back destination (0) is invalid.
 * 
 * This function is useful for avoiding code bloat loading the full mosi client
 * into frames that only need to send a simple one-off message for setup.
 * 
 * Saka Key (https://github.com/lusakasa/sakakey) loads a small setup script
 * into each frame, and if the frame is determined to be valid, uses this
 * to send a message to the background page, which loads the full Saka Key
 * content script using chrome.tabs.executeScript.
 */
export const msg = (dst: Destination, action: string, arg: any): void => {
  if (dst === 0) {
    throw Error('light-client msg self unsupported');
  }
  chrome.runtime.sendMessage({
    mosi_lw_msg: 1,
    dst,
    action,
    arg
  });
};
