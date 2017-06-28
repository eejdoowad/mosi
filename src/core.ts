import {
  Action,
  ActionDetails,
  Config, Destination,
  GetResult,
  Message,
  Node,
  Transactions,
  DEFAULT_TIMEOUT
} from './node';

interface Connection {
  port?: chrome.runtime.Port;
  id: number;
  subs: string[];
  onDisconnect: ActionDetails[];
  tabId?: number;
  frameId?: number;
  closed?: boolean;
  transactions: Transactions;
  sender: chrome.runtime.MessageSender;
  data: any;
}

class Connections {
  connectionsByPort = new Map<chrome.runtime.Port, Connection>();
  connectionsById = new Map<number, Connection>();
  nextId = 2;
  /** Adds new connection, returning its id */
  add = (port: chrome.runtime.Port, subs: string[], onDisconnect: ActionDetails[]): number => {
    /** browser action, page actions, devtools won't have tabId or frameId */
    const sender = <chrome.runtime.MessageSender> port.sender;
    let tabId;
    if (sender.tab) tabId = sender.tab.id;
    const frameId = sender.frameId;
    /** client ids start at 2: 0 refers to self, 1 refers to core */
    const id = this.nextId++;
    const transactions = new Transactions();
    const connection = { port, id, subs, onDisconnect, tabId, frameId, transactions, sender, data: {} };
    this.connectionsByPort.set(port, connection);
    this.connectionsById.set(id, connection);
    return id;
  }
  remove = (port: chrome.runtime.Port): void => {
    const connection = <Connection> this.connectionsByPort.get(port);
    // This code will clean up a connections transactions on removal, consider adding it back
    // instead of relying on timeouts.
    // const transactions = connection.transactions.transactions;
    // for (const tid in transactions) {
    //     if (transactions.hasOwnProperty(tid)) {
    //       connection.transactions.delete(tid);
    //     }
    // }
    this.connectionsById.delete(connection.id);
    this.connectionsByPort.delete(port);
  }
  /** execute callback in context of a temporary connection, used for light-client */
  withTmpConnection = async (sender: chrome.runtime.MessageSender, callback: Function) => {
    let tabId;
    if (sender.tab) tabId = sender.tab.id;
    const frameId = sender.frameId;
    const id = this.nextId++;
    const transactions = new Transactions();
    const connection = { id, subs: [], onDisconnect: [], tabId, frameId, transactions, sender, data: {} };
    this.connectionsById.set(id, connection);
    await callback(id);
    this.connectionsById.delete(id);
  }
  getByPort = (port: chrome.runtime.Port) => this.connectionsByPort.get(port)
  getById = (id: number) =>  this.connectionsById.get(id);
}

class Core extends Node {

  connections = new Connections();

  constructor () {
    super();
    /** adds a listener for light-client messages */
    chrome.runtime.onMessage.addListener(({ mosi_lw_msg, dst, action, arg }, sender) => {
      if (mosi_lw_msg) {
        this.log('Rx', 'msg', 'lw_client', dst, action, arg);
        this.connections.withTmpConnection(sender, async (connectionId: number) => {
          await this._msg(connectionId, dst, action, arg);
        });
      }
    });
  }

  /**
   * The background page doubles as the Communication Administrator. It must:
   * 1. Run its own onConnect actions on init.
   * 2. Run every other node's onConnect actions when they connect.
   * 3. Run every other node's onDisconnect actions when they disconnect.
   * 4. Never execute its own onDisconnect handlers because it should never disconnect.
   * 5. Maintain information about itself.
   * 6. Maintain information about active connections.
   */
  init = ({ subscriptions = [], onConnect = [], onDisconnect = [], actions, log = false }: Config) => {
    this.initLogging(log);
    this.subscriptions = subscriptions;
    this.actions = actions;
    chrome.runtime.onConnect.addListener((port) => {
      const { subs, onConnect: onC, onDisconnect: onD } = JSON.parse(port.name);
      const id = this.connections.add(port, subs, onD);
      port.onDisconnect.addListener(this.disconnectListener);
      port.onMessage.addListener(this.messageListener);
      this.executeOnConnectionActions(id, onC);
    });
    this.executeOnConnectionActions(0, onConnect);
  }

  executeOnConnectionActions = (src: number, actionDetails: ActionDetails[]) => {
    actionDetails.forEach(({ action, arg, dst = 0 }) => {
      this._msg(src, dst, action, arg);
    });
  }

  getTargets = (src: number, dst: Destination): [boolean, Connection[]] => {
    let targetSelf = false;
    let targets: Connection[] = [];
    if (typeof dst === 'number') {
      if (dst === 0 || dst === 1) {
        targetSelf = true;
      } else {
        const target = this.connections.getById(dst);
        if (!target) {
          console.error('ERROR: attempted to message non-existent client');
        } else if (target.closed) {
          console.error('ERROR: attempted to message over closed connection');
        } else {
          targets = [target];
        }
      }
    } else if (typeof dst === 'string') {
      targetSelf = this.subscriptions.includes(dst);
      targets = this.getStringTargets(src, dst);
    } else {
      console.error('ERROR: dst type is invalid');
    }
    return [targetSelf, targets];
  }

  /** 
   * If the destination includes the current node, execute the action locally.
   * Also send an action message to every other destination node.
   * TODO: CLEAN THIS UP
   */
  _msg = (src: number, dst: Destination, action: string, arg: any): void => {
    const [targetSelf, targets] = this.getTargets(src, dst);
    if (targetSelf) this.actionHandler(action, arg, src);
    targets.forEach(({port}) => {
      if (port) {
        this.log('Tx', 'msg', src, dst, action, arg);
        port.postMessage({ t: 'msg', src, dst, action, arg });
      } else {
        throw Error('No messaging light-clients');
      }
    });
  }

  msg = this._msg.bind(undefined, 1);

/** 
 * A destination is composed of multiple subdestinations separated by semicolons.
 * A connection receives a message if it is part of any subdestination.
 * A subdestination is composed of multiple conditions separated by periods.
 * A connection is part of a subdestination if it satisfies all its conditions.
 * This is conceptually akin to a conjunctive normal form (OR of AND) boolean formula.
 * getStringTargets should not include the local node as that is handled by a separate
 * local action handler.
 */
  getStringTargets = (src: number, dst: string): Connection[] => {
    /** Returns true if the given connection is part of the destination, else false */
    const predicate = (connection: Connection): boolean => {
      if (connection.closed) return false;
      for (const subDst of dst.split('|')) {
        const allConditionsMet = subDst.split('&').map<boolean>((condition) => {
          if (connection.subs.includes(condition)) {
            return true;
          }
          if (condition === 'topFrame') {
            return connection.frameId === 0;
          }
          if (condition === 'childFrames') {
            return connection.frameId !== 0;
          }
          if (condition === 'otherFrames') {
            return connection.frameId !== (<Connection>this.connections.getById(src)).frameId;
          }
          if (condition === 'thisTab') {
            return connection.tabId === (<Connection>this.connections.getById(src)).tabId;
          }
          const tabCondition = condition.match(/tab\[(\d+)\]/);
          if (tabCondition) {
            return connection.tabId === parseInt(tabCondition[1], 10);
          }
          const frameCondition = condition.match(/frame\[(\d+)\]/);
          if (frameCondition) {
            return connection.frameId === parseInt(frameCondition[1], 10);
          }
          const idCondition = condition.match(/id\[(\d+)\]/);
          if (idCondition) {
            return connection.id === parseInt(idCondition[1], 10);
          }
          return false;
        }).every((conditionMet) => conditionMet);
        if (allConditionsMet) return true;
      }
      return false;
    };
    // TODO: review perfomance cost of array conversion, perhaps rewrite to avoid conversion
    return [...this.connections.connectionsById.values()].filter(predicate);
  }

  _getLocal = async (src: number, action: string, arg: any): Promise<GetResult> => {
    try {
      return { id: 1, v: await this.actionHandler(action, arg, src) };
    } catch(error) {
      return { id: 1, e: error };
    }
  }

  _getRemote = (connection: Connection, src: number, action: string, arg: any, timeout: number): Promise<GetResult> => {
    return new Promise<GetResult>((resolve, reject) => {
      const tid = connection.transactions.new(resolve, reject, timeout);
      if (connection.port) {
        this.log('Tx', 'get', src, connection.id, action, arg, tid);
        connection.port.postMessage({ t: 'get', src, dst: connection.id , action,  arg, tid });
      } else {
        throw Error('No messaging light-clients');
      }
    });
  }

  _get = (src: number, dst: Destination, action: string, arg: any, timeout: number = DEFAULT_TIMEOUT): Promise<GetResult[]> => {
    const [targetSelf, targets] = this.getTargets(src, dst);
    const localResult: Array<Promise<GetResult>> = (targetSelf)
      ? [this._getLocal(src, action, arg)]
      : [];
    const remoteResults = targets.map((target) => {
      return this._getRemote(target, src, action, arg, timeout)
    });

    // TODO: Proper Promise handling (don't fail if any fails)
    try {
      return Promise.all([...localResult, ...remoteResults]);
    } catch (e) {
      console.error(e, 'connections: ', this.connections);
      return Promise.resolve([]);
    }
  }

  get = this._get.bind(undefined, 1);

  /**
   * Executes onDisconnt actions and deletes data associated with connection.
   * Connection is marked as closed so that no messages are sent to it when executing
   * onDisconnect actions.
   */
  disconnectListener = (port: chrome.runtime.Port): void => {
    const connection = <Connection> this.connections.getByPort(port);
    connection.closed = true;
    this.executeOnConnectionActions(connection.id, connection.onDisconnect);
    this.connections.remove(port);
  }

  /**
   * Handles messages on receipt by calling the appropriate internal function
   */
  messageListener = ({ src, dst, t, action, arg, tid, res, timeout }: Message, port: chrome.runtime.Port) => {
    if (src === undefined) src = (<Connection> this.connections.getByPort(port)).id;
    switch (t) {
      case 'msg':
        this.log('Rx', 'msg', src, dst, action, arg);
        this._msg(src, dst, action, arg);
        break;
      case 'get':
        this.log('Rx', 'get', src, dst, action, arg, tid);
        this._get(src, dst, action, arg, <number>timeout).then((result) => {
          this.log('Tx', 'rsp', <number>src, dst, action, result, tid);
          port.postMessage({ t: 'rsp', src: dst, dst: src, action, res: result, tid });
        }).catch((e) => {
          this.log('Tx', 'rsp', <number>src, dst, action, { e }, tid);
          port.postMessage({ t: 'rsp', src: dst, dst: src, action, res: { e }, tid });
        });
        break;
      case 'rsp':
          this.log('Rx', 'rsp', <number>src, dst, action, res, tid);
        const connection = this.connections.getByPort(port);
        if (connection) {
          connection.transactions.complete(<number> tid, res);
        }
        // the code may get here if a transaction is received over a connection
        // that subsequently closed. Do nothing, a timeout will trigger the
        // reject handler automatically.
        break;
      default:
        throw Error(`Invalid message class: ${t}`);
    }
  }

  meta = (connectionId: number) => {
    const connection = this.connections.getById(connectionId);
    if (connection) {
      return {
        frameId: connection.frameId,
        tabId: connection.tabId,
        sender: connection.sender,
        subs: connection.subs,
        data: connection.data
      };
    }
    return undefined;
  }
}

const node = new Core();
const init = node.init;
const msg = node.msg;
const get = node.get;
const meta = node.meta;
export { init, msg, meta, get };
