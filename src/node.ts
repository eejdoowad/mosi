export type Action = (arg: any, src: number) => void;
export type Destination = string | number;
export interface Communicator {
  msg(action: string, arg?: any): void;
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
  src?: number;
  dst: Destination;
  t: string;
  action: string;
  arg?: any; };
export interface MessageListener { (message: Message, port: chrome.runtime.Port): void; }

export interface Transaction {
  src: string;
  id: number;
}

export abstract class Node {

  actions: { [key: string]: Action };
  subscriptions: string[];
  nextTransactionId = 0;
  transactions: Transaction[] = [];

  abstract init: (config: Config) => void;
  abstract msg: (dst: Destination, action: string, arg: any, src: string) => void;
  abstract get: (dst: Destination, action: string, arg: any) => Promise<any[]>;
  abstract disconnectListener: (port: chrome.runtime.Port) => void;
  abstract messageListener: ({ src, dst, t, action, arg }: Message, port: chrome.runtime.Port) => void;

  actionHandler = (action: string): Action =>
    this.actions[action] || this.errorHandler(action);
  errorHandler = (action: string) => (arg: any) => {
    console.error(`ERROR: No action type ${action}`);
  }
}
