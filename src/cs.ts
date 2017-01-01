import { v4 } from "uuid";
import Node from "./node";

class CS extends Node {

  private port: chrome.runtime.Port | undefined;

  protected defaultCommunicator = (src: string) => (dst: string): Communicator => ({
    msg: (type, arg) => {
      if (this.port) {
        this.port.postMessage({
          src,
          dst,
          t: "msg",
          type,
          arg
        });
      } else {
        console.error("Cannot send message because no port exists");
      }
    }
  });

  protected specialCommunicators = (src: string): { [key: string]: Communicator } => ({
    [this.id]: this.localCommunicator,
    self: this.localCommunicator
  });

  protected disconnectListener = (port: chrome.runtime.Port): void => {
    this.port = undefined;
    console.error("The port to the background page has closed");
  }

  public init = (actions: ActionsGenerator, subscriptions: string[]) => {
    this._actions = this._actions;
    const connectionInfo = {
      subs: [this.id, ...subscriptions]
    };
    this.port = chrome.runtime.connect({name: JSON.stringify(connectionInfo)});

    this.port.onDisconnect.addListener(this.disconnectListener);
    this.port.onMessage.addListener(this.messageListener);
  }

  public id: string = v4();
}

const node = new CS();
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
