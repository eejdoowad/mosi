export type Action = (arg: any) => void;
export interface Messager {
  (type: string, arg?: any): void;
}
export interface Communicator {
  msg(type: string, arg?: any): void;
}

type Message = { src: string, dst: string, t: string, type: string, arg?: any };
type MessageListener = (message: Message, port: chrome.runtime.Port) => void;

export interface ActionDetails {
  action: string;
  arg?: any;
  dst?: string; 
};
export interface Config {
  subscriptions?: string[];
  onConnect?: ActionDetails[];
  onDisconnect?: ActionDetails[];
  actions: { [key: string]: Action };
}

export abstract class Node {

  id: string;
  src: string;
  actions: { [key: string]: Action };
  subscriptions: string[];

  abstract init: (config: Config) => void;
  abstract disconnectListener: (port: chrome.runtime.Port) => void;
  abstract defaultCommunicator: (dst: string) => Communicator;

  localCommunicator: Communicator = {
    msg: (type, arg) => this.actionHandler(type)(arg)
  };
  specialCommunicators: { [key: string]: Communicator } = {
    [this.id]: this.localCommunicator,
    self: this.localCommunicator
  };
  net = (dst: string): Communicator => (
    this.specialCommunicators[dst] ||
    this.subscriptions.includes(dst) && this.localCommunicator ||
    this.defaultCommunicator(dst)
  );

  errorHandler = (type: string) => (arg: any) => {
    console.error(`ERROR: No action type ${type}`);
  }
  actionHandler = (type: string): Action =>
    this.actions[type] || this.errorHandler(type);

  messageListener = ({ src, dst, t, type, arg }: Message, port: chrome.runtime.Port) => {
    this.src = src;
    switch (t) {
      case 'msg':
        this.net(dst)[t](type, arg); return;
      case 'get':
        console.error('ERROR: Not yet implemented'); return;
      default:
        console.error(`ERROR: Invalid message class: ${t}`); return;
    }
  }
};
