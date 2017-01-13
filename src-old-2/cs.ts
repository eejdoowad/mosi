import { Communicator, Config, Node } from './node';

class CS extends Node {

  port: chrome.runtime.Port;

   init = ({ subscriptions = [], onConnect = [], onDisconnect = [], actions }: Config) => {
    this.subscriptions = subscriptions;
    this.actions = actions;
    const connectionInfo = { subs: this.subscriptions, onConnect, onDisconnect };
    this.port = chrome.runtime.connect({name: JSON.stringify(connectionInfo)});
    this.port.onDisconnect.addListener(this.disconnectListener);
    this.port.onMessage.addListener(this.messageListener);
  }

  /**
   * If the current node is the only target, immediately execute the
   * action locally, otherwise forward the message to the background
   * page
   */
  net = (dst: string): Communicator => ({
    msg: (type, arg) => {
      if (dst === 'self') {
        this.actionHandler(type)(arg);
      } else {
        this.port.postMessage({
          src: this.src,
          dst,
          t: 'msg',
          type,
          arg
        });
      }
    }
  })

  disconnectListener = (port: chrome.runtime.Port): void => {
    console.error('ERROR. The port to the background page has closed.');
  }
}

const node = new CS();
const init = node.init;
const net = node.net;
const src = () => node.src;
export { init, net, src};
