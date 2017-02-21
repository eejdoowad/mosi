export type Action = (arg: any, src: number) => any;
export type Destination = string | number;
export type GetResult = {
  id: number,
  v?: any,
  e?: any
};
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
  arg?: any;
  tid?: number;
  res?: any;
};
export interface MessageListener { (message: Message, port: chrome.runtime.Port): void; }

type TransactionInfo = {
  resolve: Function,
  reject: Function,
  timer: NodeJS.Timer
};

export class Transactions {
  tid = 0;
  transactions: { [key: number]: TransactionInfo} = {};
  timeout: number;
  constructor(timeout = 1000) { this.timeout = timeout; }
  new = (resolve: Function, reject: Function) => {
    const tid = ++this.tid;
    const timer = setTimeout(() => {
      this.delete(tid);
      reject(`Transaction ${tid} timed out.`);
    }, this.timeout);
    this.transactions[tid] = { resolve, reject, timer}
    return tid
  }
  delete = (tid: number) => {
    clearTimeout(this.transactions[tid].timer);
    delete this.transactions[tid];
  }
  complete = (tid: number, res: GetResult) => {
    this.transactions[tid].resolve(res);
    this.delete(tid);
  }
}

export abstract class Node {

  actions: { [key: string]: Action };
  subscriptions: string[];

  abstract init: (config: Config) => void;
  abstract msg: (dst: Destination, action: string, arg: any, src: string) => void;
  abstract get: (dst: Destination, action: string, arg: any) => Promise<GetResult[]>;
  abstract disconnectListener: (port: chrome.runtime.Port) => void;
  abstract messageListener: ({ src, dst, t, action, arg }: Message, port: chrome.runtime.Port) => void;

  actionHandler = (action: string, arg: any, src: number) => {
    const handler = this.actions[action] || this.errorHandler(action);
    return handler(arg, src);
  }
  errorHandler = (action: string) => (arg: any) => {
    console.error(`ERROR: No action type ${action}`);
  }
}
