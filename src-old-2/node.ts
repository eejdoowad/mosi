export type Action = (arg: any) => void;
export interface Messager {
  (type: string, arg?: any): void;
}
export interface Communicator {
  msg(type: string, arg?: any): void;
}
export interface ActionDetails {
  action: string;
  arg?: any;
  dst?: string;
}
export interface Config {
  subscriptions?: string[];
  onConnect?: ActionDetails[];
  onDisconnect?: ActionDetails[];
  actions: { [key: string]: Action };
}
export interface Message {
  src: string;
  dst: string;
  t: string;
  type: string;
  arg?: any; };
export interface MessageListener { (message: Message, port: chrome.runtime.Port): void; }

export interface Transaction {
  src: string;
  id: number;
}

export abstract class Node {

  src: string;
  actions: { [key: string]: Action };
  subscriptions: string[];
  nextTransactionId = 0;
  transactions: Transaction[] = [];

  abstract init: (config: Config) => void;
  abstract net: (dst: string) => Communicator;
  abstract disconnectListener: (port: chrome.runtime.Port) => void;

  actionHandler = (type: string): Action =>
    this.actions[type] || this.errorHandler(type);
  errorHandler = (type: string) => (arg: any) => {
    console.error(`ERROR: No action type ${type}`);
  }

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

}
