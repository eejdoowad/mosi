import{ ActionDetails, Communicator, Config, Node  } from './node';

interface Connection {
  id: string;
  port: chrome.runtime.Port;
  subs: string[];
  onDisconnect: ActionDetails[];
}

class BP extends Node {

  connections: Connection[] = [];

  /** Because the background page is the communication admin, it must
   * 1. run its own onConnect actions
   * 2. run every other node's onConnect handler
   * 3. run every other node's onDisconnect handler
   * 4. the background page should never disconnect, so the onDisconnect handler is ignored
   */
  init = ({ subscriptions = [], onConnect = [], onDisconnect = [], actions }: Config) => {
    this.id = 'bp';
    this.subscriptions = [this.id, ...subscriptions];
    this.actions = actions;
    chrome.runtime.onConnect.addListener((port) => {
      const { id, subs, onConnect: onC, onDisconnect: onD } = JSON.parse(port.name);
      this.connections.push({ id, port, subs, onDisconnect: onD });
      port.onDisconnect.addListener(this.disconnectListener);
      port.onMessage.addListener(this.messageListener);
      this.executeActions(id, onC);
    });
    this.executeActions(this.id, onConnect);
  }

  executeActions = (src: string, actionDetails: ActionDetails[]) => {
    this.src = src;
    actionDetails.forEach(({ action, arg, dst = 'bp' }) => {
      this.net(dst).msg(action, arg);
    });
  }

  defaultCommunicator = (dst: string): Communicator => {
    const targets = this.connections.filter(({ subs }) => subs.includes(dst));
    return {
      msg: (type, arg) => {
        targets.forEach(({port}) => {
          port.postMessage({
            src: this.src,
            dst,
            t: 'msg',
            type,
            arg
          });
        });
      }
    };
  }

  disconnectListener = (port: chrome.runtime.Port): void => {
    const i = this.connections.findIndex((connection) => port === connection.port);
    const onDisconnect = this.connections[i].onDisconnect;
    this.connections.splice(i, 1);
    this.executeActions(this.id, onDisconnect);
  }
}

const node = new BP();
const init = node.init;
const net = node.net;
const src = () => node.src;
export { init, net, src};
