import Node, { ActionsGenerator, Communicator  } from "./node";

type Connection = {
  port: chrome.runtime.Port,
  subs: string[]
};

class BP extends Node {

  connections: Connection[] = [];

  defaultCommunicator = (src: string) => (dst: string): Communicator => {
    const targets = this.connections.filter(({ subs }) => subs.includes(dst));
    return {
      msg: (type, arg) => {
        targets.forEach(({port}) => {
          port.postMessage({
            src,
            dst,
            t: "msg",
            type,
            arg
          });
        });
      }
    };
  }

  specialCommunicators = (src: string): { [key: string]: Communicator } => ({
    [this.id]: this.localCommunicator,
    self: this.localCommunicator
  });

  disconnectListener = (port: chrome.runtime.Port): void => {
    this.connections = this.connections.filter((connection) => port !== connection.port);
  }

  init = (actions: ActionsGenerator, subscriptions: string[]) => {
    this._actions = this._actions;
    chrome.runtime.onConnect.addListener((port) => {
      const { subs } = JSON.parse(port.name);
      this.connections.push({ port, subs });
      port.onDisconnect.addListener(this.disconnectListener);
      port.onMessage.addListener(this.messageListener);

    });
  }

  id: string = "bp";
}

const node = new BP();
const id = node.id;
const init = node.init;
const net = node.net;

export { id, init, net};
