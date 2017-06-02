import { Action, Config, Destination, GetResult, Message, Node, Transactions } from './node';

class Client extends Node {

  port: chrome.runtime.Port;
  timeout = 1000;
  transactions = new Transactions();

  init = ({ subscriptions = [], onConnect = [], onDisconnect = [], actions, log = false }: Config) => {
    this.initLogging(log);
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
      this.actionHandler(action, arg, 0);
    } else {
      // if (this.log) console.log(`Tx(${dst}): msg[${action}], arg=`, arg);
      this.log('Tx', 'msg', 0, dst, action, arg);
      this.port.postMessage({t: 'msg', dst, action, arg });
    }
  }

  _getLocal = async (localId: number, src: number, action: string, arg: any): Promise<GetResult> => {
    try {
      return { id: localId, v: await this.actionHandler(action, arg, src) };
    } catch(error) {
      return { id: localId, e: error };
    }
  }

  _getRemote = (dst: Destination, action: string, arg: any): Promise<any[]> =>
    new Promise<GetResult[]>((resolve, reject) => {
      const tid = this.transactions.new(resolve, reject);
      // if (this.log) console.log(`Tx(${dst}): get{${tid}}[${action}], arg=`, arg);
      this.log('Tx', 'get', 0, dst, action, arg, tid);
      this.port.postMessage({t: 'get', dst, action, arg, tid });
    });
  
  /**
   * localId is the id of the current node
   * localId will be set to 0 if called locally
   * localId will be set to the node's global id if called from some other node
   */
  get = async (dst: Destination, action: string, arg: any): Promise<GetResult[]> => {
     return (dst === 0)
      ? [await this._getLocal(0, 0, action, arg)]
      : await this._getRemote(dst, action, arg);
  }

  disconnectListener = (port: chrome.runtime.Port): void => {
    console.error('ERROR. The port to the background page has closed.', chrome.runtime.lastError || '');
  }

  /**
   * Although client nodes don't include a src id when sending messsages,
   * because it is the bp's duty to populate the src id,
   * incoming messages MUST have a src id.
   * t is the message class
   * If a client node receives a message, it must be an intended destination
   */
  messageListener = ({ src, dst, t, action, arg, tid, res }: Message) => {
    switch (t) {
      case 'msg':
        // if (this.log) console.log(`Rx(${src}): msg[${action}], arg=`, arg);
        this.log('Tx', 'msg', <number>src, dst, action, arg);
        this.actionHandler(action, arg, <number> src);
        break;
      case 'get':
        // if (this.log) console.log(`Rx(${src}): get{${tid}}[${action}], arg=`, arg);
        this.log('Rx', 'get', <number>src, dst, action, arg, tid);
        this._getLocal(<number> dst, <number> src, action, arg).then((res) => {
          // if (this.log) console.log(`Tx(${src}): rsp{${tid}}[${action}], res=`, res);
        this.log('Tx', 'rsp', <number>src, dst, action, res, tid);
          this.port.postMessage({ t: 'rsp', src: dst, dst: src, action, tid, res });
        }).catch((e) => {
          // if (this.log) console.log(`Tx(${src}): rsp{${tid}}[${action}], err=`, res);
          this.log('Tx', 'rsp', <number>src, dst, action, res, tid);
          this.port.postMessage({ t: 'rsp', src: dst, dst: src, action, tid, res: { e } });
        });
        break;
      case 'rsp':
        // if (this.log) console.log(`Rx(${src}): rsp{${tid}}[${action}], res= `, res);
        this.log('Rx', 'rsp', <number>src, dst, action, res, tid);
        this.transactions.complete(<number> tid, res);
        break;
      default:
        console.error(`ERROR: Invalid message class: ${t}`);
        break;
    }
  }
}

const node = new Client();
const init = node.init;
const msg = node.msg;
const get = node.get;
export { init, msg, get };
