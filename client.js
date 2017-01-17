import { Node } from './node';
class Transactions {
  constructor () {
    this.timeout = 1000;
    this.transactionId = 0;
    this.transactions = new Map();
    this.createGet = (port, dst, action, arg) => {
      return new Promise((resolve, reject) => {
        this.transactionId++;
        port.postMessage({ dst, t: 'get', action, arg, tid: this.transactionId });
        const timeout = setTimeout(() => {
          this.transactions.delete(this.transactionId);
          reject(`ERROR: no response received within ${this.timeout}ms`);
        }, this.timeout);
        this.transactions.set(this.transactionId, { resolve, reject, timeout });
      });
    };
    this.onRsp = (tid, res) => {
      const transaction = this.transactions.get(tid);
      if (transaction) {
        clearTimeout(transaction.timeout);
        transaction.resolve(res);
      } else {
        console.error(`transaction ${tid} must have been rejected already`);
      }
      this.transactions.delete(tid);
    };
  }
}
class Client extends Node {
  constructor () {
    super(...arguments);
    this.transactions = new Transactions();
    this.init = ({ subscriptions = [], onConnect = [], onDisconnect = [], actions }) => {
      this.subscriptions = subscriptions;
      this.actions = actions;
      const connectionInfo = { subs: this.subscriptions, onConnect, onDisconnect };
      this.port = chrome.runtime.connect({ name: JSON.stringify(connectionInfo) });
      this.port.onDisconnect.addListener(this.disconnectListener);
      this.port.onMessage.addListener(this.messageListener);
    };
        /**
         * If the current node is the only target, immediately execute the
         * action locally, otherwise forward the message to the background
         * page.
         * Doesn't send src id because only background page populates src id.
         */
    this.msg = (dst, action, arg) => {
      if (dst === 0) {
        this.actionHandler(action)(arg, 0);
      } else {
        this.port.postMessage({ dst, t: 'msg', action, arg });
      }
    };
    this.get = async (dst, action, arg) => {
      if (dst === 0) {
        return await this.getLocal(action, arg);
      } else {
        return this.transactions.createGet(this.port, dst, action, arg);
      }
    };
    this.disconnectListener = (port) => {
      console.error('ERROR. The port to the background page has closed.');
    };
        /**
         * Although client nodes don't include a src id when sending messsages,
         * because it is the bp's duty to populate the src id,
         * incoming messages MUST have a src id.
         * t is the message class
         * If a client node receives a message, it must be an intended destination
         */
    this.messageListener = ({ src, dst, t, action, arg, tid, res }, port) => {
      switch (t) {
        case 'msg':
          this.actionHandler(action)(arg, src);
          return;
        case 'get':
          console.error('ERROR: Not yet implemented');
          return;
        case 'rsp':
          this.transactions.onRsp(tid, res);
          return;
        default:
          console.error(`ERROR: Invalid message class: ${t}`);
          return;
      }
    };
  }
}
const node = new Client();
const init = node.init;
const msg = node.msg;
const get = node.get;
export { init, msg, get };
