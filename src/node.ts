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
  log: boolean;
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

type Logger = (
  tx_or_rx: string,
  type: string,
  src: string | number,
  dst: string | number,
  action: string,
  arg_or_res?: any,
  tid?: number
) => void;

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
    return tid;
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
  log: Logger;

  abstract init: (config: Config) => void;
  abstract msg: (dst: Destination, action: string, arg: any, src: string) => void;
  abstract get: (dst: Destination, action: string, arg: any) => Promise<GetResult[]>;
  abstract disconnectListener: (port: chrome.runtime.Port) => void;
  abstract messageListener: ({ src, dst, t, action, arg }: Message, port: chrome.runtime.Port) => void;

  actionHandler = (action: string, arg: any, src: number) => {
    const handler = this.actions[action];
    if (handler) return handler(arg, src);
    throw Error(`No handler for action ${action}`);
  }

  initLogging = (log: boolean) => {
    this.log = log
    ? (tx_or_rx, type, src, dst, action, arg_or_res, tid) => {
        const arg_str = type === 'rsp' ? 'res' : 'arg';
        const tid_str = tid === undefined ? '' : `:${tid}`;
        console.log(`%c${tx_or_rx}%c[%c${type}%c${tid_str}](${src} -> ${dst}) :: %c${action}%c, ${arg_str}=`,
        `color: ${tx_or_rx === 'Tx' ? 'green' : 'red'}`,
        'color: auto',
        `color: ${type === 'get' ? 'blueviolet': type === 'msg' ? 'blue' : 'brown'}`,
        'color: auto',
        'color: teal',
        'color: auto',
        arg_or_res);
      }
    : () => {};
  }
}
