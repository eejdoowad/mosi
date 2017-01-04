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

  disconnectListener = (port: chrome.runtime.Port): void => {
    this.connections = this.connections.filter((connection) => port !== connection.port);
  }

  init = (actions: ActionsGenerator, subscriptions: string[] = []) => {
    this.actions = actions;
    this.subs = [this.id, ...subscriptions];
    chrome.runtime.onConnect.addListener((port) => {
      const { subs } = JSON.parse(port.name);
      this.connections.push({ port, subs });
      port.onDisconnect.addListener(this.disconnectListener);
      port.onMessage.addListener(this.messageListener);
    });
  }

  id: string = "bp";
  net = this.communicator(this.id);
}

const node = new BP();
const init = node.init;
const net = node.net;

export { init, net};
