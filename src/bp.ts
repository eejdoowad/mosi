import Node, { ActionDetails, Communicator, Config, src  } from './node';

type Connection = {
  port: chrome.runtime.Port,
  subs: string[],
  onDisconnect?: ActionDetails};

class BP extends Node {

  connections: Connection[] = [];

  init = ({ subscriptions = [], onConnect, onDisconnect, actions }: Config) => {
    this.sharedInit({ subscriptions, onConnect, actions });
    chrome.runtime.onConnect.addListener((port) => {
      const { subs } = JSON.parse(port.name);
      this.connections.push({ port, subs, onDisconnect });
      port.onDisconnect.addListener(this.disconnectListener);
      port.onMessage.addListener(this.messageListener);
    });
  }

  initializeId(): void {
    this.id = 'bp';
  }

  defaultCommunicator = (dst: string): Communicator => {
    const targets = this.connections.filter(({ subs }) => subs.includes(dst));
    return {
      msg: (type, arg) => {
        targets.forEach(({port}) => {
          port.postMessage({
            _src: src,
            _dst: dst,
            _t: 'msg',
            type,
            arg
          });
        });
      }
    };
  }

  disconnectListener = (port: chrome.runtime.Port): void => {
    this.connections = this.connections.filter((connection) => port !== connection.port);
  }
}

const node = new BP();
const init = node.init;
const net = node.net;

export { init, net};
