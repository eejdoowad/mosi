import { Action, Config, Destination, GetResult, Message, Node, Transactions } from './node';

class Client extends Node {

  actions: { [key: string]: Action };
  port: chrome.runtime.Port;
  timeout = 1000;
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
      this.port.postMessage({t: 'msg', dst, action, arg });
    }
  }

  _getLocal = async (localId: number, src: number, action: string, arg: any): Promise<GetResult> => {
    try {
      return { id: localId, v: await this.actionHandler(action)(arg, src) };
    } catch(error) {
      return { id: localId, e: error };
    }
  }

  _getRemote = (dst: Destination, action: string, arg: any): Promise<any[]> =>
    new Promise<GetResult[]>((resolve, reject) => {
      const tid = this.transactions.new(resolve, reject);
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
    console.error('ERROR. The port to the background page has closed.');
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
        this.actionHandler(action)(arg, <number> src);
        break;
      case 'get':
        this._getLocal(<number> dst, <number> src, action, arg).then((res) => {
          this.port.postMessage({ t: 'rsp', src: dst, dst: src, tid, res });
        });
        break;
      case 'rsp':
        this.transactions.complete(<number> tid, res);
        break;
      default:
        console.error(`ERROR: Invalid message class: ${t}`);
        break;
    }
  }

  actionHandler = (action: string): Action =>
    this.actions[action] || this.errorHandler(action);
  errorHandler = (action: string) => (arg: any) => {
    console.error(`ERROR: No action type ${action}`);
  }
}


const node = new Client();
const init = node.init;
const msg = node.msg;
const get = node.get;
export { init, msg, get };
