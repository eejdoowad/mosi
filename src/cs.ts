import { v4 } from 'uuid';
import { Communicator, Config, Node } from './node';

class CS extends Node {

  port: chrome.runtime.Port;

   init = ({ subscriptions = [], onConnect = [], onDisconnect = [], actions }: Config) => {
    this.id = v4();
    this.subscriptions = ['cs', this.id, ...subscriptions];
    this.actions = actions;
    const connectionInfo = { id: this.id, subs: this.subscriptions, onConnect, onDisconnect };
    this.port = chrome.runtime.connect({name: JSON.stringify(connectionInfo)});
    this.port.onDisconnect.addListener(this.disconnectListener);
    this.port.onMessage.addListener(this.messageListener);
  }

  defaultCommunicator = (dst: string): Communicator => ({
    msg: (type, arg) => {
      this.port.postMessage({
        src: this.src,
        dst,
        t: 'msg',
        type,
        arg
      });
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
