import { v4 } from 'uuid';
import Node, { Communicator, setSrc, src } from './node';

class CS extends Node {

  port: chrome.runtime.Port | undefined;

  initializeId(): void {
    this.id = v4();
  }

  defaultCommunicator = (dst: string): Communicator => ({
    msg: (type, arg) => {
      if (this.port) {
        this.port.postMessage({
          _src: src,
          _dst: dst,
          _t: 'msg',
          type,
          arg
        });
      } else {
        console.error('Cannot send message because no port exists');
      }
    }
  })

  disconnectListener = (port: chrome.runtime.Port): void => {
    this.port = undefined;
    console.error('The port to the background page has closed');
  }

  init = (config) => {
    this.actions = actions;
    this.subs = [this.id, 'cs', ...subscriptions];
    const connectionInfo = { subs: this.subs };
    this.port = chrome.runtime.connect({name: JSON.stringify(connectionInfo)});

    this.port.onDisconnect.addListener(this.disconnectListener);
    this.port.onMessage.addListener(this.messageListener);
  }
}

const node = new CS();
const init = node.init;
const net = node.net;

export { init, net, src};
