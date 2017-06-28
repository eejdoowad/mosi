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
  timeout?: number;
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

export const DEFAULT_TIMEOUT = 5000;

export class Transactions {
  tid = 0;
  transactions: { [key: number]: TransactionInfo} = {};
  new = (resolve: Function, reject: Function, timeout: number) => {
    const tid = ++this.tid;
    const timer = setTimeout(() => {
      delete this.transactions[tid];
      reject(`Transaction ${tid} timed out.`);
    }, timeout);
    this.transactions[tid] = { resolve, reject, timer}
    return tid;
  }
  complete = (tid: number, res: GetResult) => {
    // The transaction may have already timed out, so check if it still exists
    const transaction = this.transactions[tid];
    if (transaction) {
      transaction.resolve(res);
      clearTimeout(transaction.timer);
      delete this.transactions[tid];
    }
  }
}

export abstract class Node {

  actions: { [key: string]: Action };
  subscriptions: string[];
  log: Logger;

  abstract init: (config: Config) => void;
  abstract msg: (dst: Destination, action: string, arg: any, src: string) => void;
  abstract get: (dst: Destination, action: string, arg: any, timeout: number) => Promise<GetResult[]>;
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
