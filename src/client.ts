import {
  Action,
  ActionDetails,
  Config,
  Destination,
  GetResult,
  Message,
  Node,
  Transactions,
  DEFAULT_TIMEOUT
} from './node';

class Client extends Node {

  port: chrome.runtime.Port;
  timeout = 1000;
  transactions = new Transactions();
  onClientDisconnect?: () => void;
  onConnect: ActionDetails[];
  onDisconnect: ActionDetails[];

  init = ({ subscriptions = [], onConnect = [], onDisconnect = [], actions, log = false, onClientDisconnect }: Config) => {
    this.initLogging(log);
    this.subscriptions = subscriptions;
    this.actions = actions;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
    this.onClientDisconnect = onClientDisconnect;
    this.connect();
    // firefox doesn't fire port.onDisconnect on the background page for navigation
    // events so every content script must manually call port.disconnect() on unload
    // TODO: remove this event listener when the following bug is fixed
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1370368
    window.addEventListener('beforeunload', () => {
      this.port.disconnect();
    })
  }

  connect = () => {
    const { subscriptions: subs, onConnect, onDisconnect } = this;
    const connectionInfo = { name: JSON.stringify({ subs, onConnect, onDisconnect })};
    this.port = chrome.runtime.connect(connectionInfo);
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

  _getRemote = (dst: Destination, action: string, arg: any, timeout: number): Promise<any[]> =>
    new Promise<GetResult[]>((resolve, reject) => {
      const tid = this.transactions.new(resolve, reject, timeout);
      this.log('Tx', 'get', 0, dst, action, arg, tid);
      this.port.postMessage({t: 'get', dst, action, arg, tid, timeout });
    });
  
  /**
   * localId is the id of the current node
   * localId will be set to 0 if called locally
   * localId will be set to the node's global id if called from some other node
   */
  get = async (dst: Destination, action: string, arg: any, timeout: number = DEFAULT_TIMEOUT): Promise<GetResult[]> => {
     return (dst === 0)
      ? [await this._getLocal(0, 0, action, arg)]
      : await this._getRemote(dst, action, arg, timeout);
  }

  disconnectListener = (port: chrome.runtime.Port): void => {
    this.onClientDisconnect && this.onClientDisconnect();
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
        this.log('Rx', 'msg', <number>src, dst, action, arg);
        this.actionHandler(action, arg, <number> src);
        break;
      case 'get':
        this.log('Rx', 'get', <number>src, dst, action, arg, tid);
        this._getLocal(<number> dst, <number> src, action, arg)
          .then((res) => {
           try {
              this.log('Tx', 'rsp', <number>src, dst, action, res, tid);
              this.port.postMessage({ t: 'rsp', src: dst, dst: src, action, tid, res });
            } catch (e) {} // the port may disconnect if the user navigated to a new page
          }).catch((e) => {
            try {
              this.log('Tx', 'rsp', <number>src, dst, action, res, tid);
              this.port.postMessage({ t: 'rsp', src: dst, dst: src, action, tid, res: { e } });
            } catch (e) {}
          });
        break;
      case 'rsp':
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
