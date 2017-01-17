import { Communicator, Config, Destination, GetResult, Message, Node } from './node';

type TDetails = {
    resolve: Function,
    reject: Function,
    timeout: NodeJS.Timer
};
type TMap = Map<number, TDetails>;

class Transactions {

  timeout = 1000;
  transactionId = 0;
  transactions: TMap = new Map();

  createGet = (port: chrome.runtime.Port, dst: Destination, action: string, arg: any): Promise<any[]> => {
    return new Promise<any[]>((resolve, reject) => {
      this.transactionId++;
      port.postMessage({ dst, t: 'get', action,  arg, tid: this.transactionId });
      const timeout = setTimeout(() => {
        this.transactions.delete(this.transactionId);
        reject(`ERROR: no response received within ${this.timeout}ms`);
      }, this.timeout);
      this.transactions.set(this.transactionId, { resolve, reject, timeout });
    });
  }
  onRsp = (tid: number, res: any): void => {
    const transaction = this.transactions.get(tid);
    if (transaction) {
      clearTimeout(transaction.timeout);
      transaction.resolve(res);
    } else { // TODO: remove this
      console.error(`transaction ${tid} must have been rejected already`);
    }
    this.transactions.delete(tid);
  }
}

class Client extends Node {

  port: chrome.runtime.Port;
  transactions = new Transactions();

   init = ({ subscriptions = [], onConnect = [], onDisconnect = [], actions }: Config) => {
    this.subscriptions = subscriptions;
    this.actions = actions;
    const connectionInfo = { subs: this.subscriptions, onConnect, onDisconnect };
    this.port = chrome.runtime.connect({name: JSON.stringify(connectionInfo)});
    this.port.onDisconnect.addListener(this.disconnectListener);
    this.port.onMessage.addListener(this.messageListener);
  }

  /**
   * If the current node is the only target, immediately execute the
   * action locally, otherwise forward the message to the background
   * page.
   * Doesn't send src id because only background page populates src id.
   */
  msg = (dst: Destination, action: string, arg: any): void => {
    if (dst === 0) { // TODO: support .unique also
      this.actionHandler(action)(arg, 0);
    } else {
      this.port.postMessage({ dst, t: 'msg', action,  arg });
    }
  }

  get = async (dst: Destination, action: string, arg: any): Promise<GetResult[]> => {
    if (dst === 0) {
      return await this.getLocal(action, arg);
    } else {
      return this.transactions.createGet(this.port, dst, action, arg);
    }
  }

  disconnectListener = (port: chrome.runtime.Port): void => {
    console.error('ERROR. The port to the background page has closed.');
  }

  /**
   * Although client nodes don't include a src id when sending messsages,
   * because it is the bp's duty to populate the src id,
   * incoming messages MUST have a src id.
   * t is the message class
   * If a client node receives a message, it must be an intended destination
   */

  messageListener = ({ src, dst, t, action, arg, tid, res }: Message, port: chrome.runtime.Port) => {
    switch (t) {
      case 'msg':
        this.actionHandler(action)(arg, <number> src);
        return;
      case 'get':
        console.error('ERROR: Not yet implemented');
        return;
      case 'rsp':
        this.transactions.onRsp(<number> tid, res);
        return;
      default:
        console.error(`ERROR: Invalid message class: ${t}`);
        return;
    }
  }
}

const node = new Client();
const init = node.init;
const msg = node.msg;
const get = node.get;
export { init, msg, get };
