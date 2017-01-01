import Node from "./node";

class BP extends Node {

  private connections: Connection[] = [];

  protected defaultCommunicator = (src: string) => (dst: string): Communicator => {
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

  protected specialCommunicators = (src: string): { [key: string]: Communicator } => ({
    [this.id]: this.localCommunicator,
    self: this.localCommunicator
  });

  protected disconnectListener = (port: chrome.runtime.Port): void => {
    this.connections = this.connections.filter((connection) => port !== connection.port);
  }

  public init = (actions: ActionsGenerator, subscriptions: string[]) => {
    this._actions = this._actions;
    chrome.runtime.onConnect.addListener((port) => {
      const { subs } = JSON.parse(port.name);
      this.connections.push({ port, subs });
      port.onDisconnect.addListener(this.disconnectListener);
      port.onMessage.addListener(this.messageListener);

    });
  }

  public id: string = "bp";
}

const node = new BP();
const con = node.con;
const id = node.id;
const init = node.init;
const net = node.net;

export {
  con,
  id,
  init,
  net
};
