import { ActionDetails, Config, Destination, GetResult, Message, Node, Transactions  } from './node';

export type Action = (arg: any, src: number, sender?: chrome.runtime.MessageSender) => any;

interface Connection {
  port: chrome.runtime.Port;
  id: number;
  subs: string[];
  onDisconnect: ActionDetails[];
  tabId?: number;
  frameId?: number;
  closed?: boolean;
  transactions: Transactions;
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
    const connection = { port, id, subs, onDisconnect, tabId, frameId, transactions };
    this.connectionsByPort.set(port, connection);
    this.connectionsById.set(id, connection);
    return id;
  }
  remove = (port: chrome.runtime.Port): void => {
    this.connectionsById.delete((<Connection> this.connectionsByPort.get(port)).id);
    this.connectionsByPort.delete(port);
  }
  getByPort = (port: chrome.runtime.Port) => this.connectionsByPort.get(port)
  getById = (id: number) =>  this.connectionsById.get(id);
}

class Core extends Node {

  actions: { [key: string]: Action };
  connections = new Connections();

  constructor () {
    super();
    /** adds a listener for light-client messages */
    chrome.runtime.onMessage.addListener(({ mosi_lw_msg, dst, action, arg }) => {
      if (mosi_lw_msg) this._msg(1, dst, action, arg);
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
  init = ({ subscriptions = [], onConnect = [], onDisconnect = [], actions }: Config) => {
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

  getTargets = (dst: Destination): [boolean, Connection[]] => {
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
      targets = this.getStringTargets(dst);
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
    const [targetSelf, targets] = this.getTargets(dst);
    if (targetSelf) this.actionHandler(action, arg, src);
    targets.forEach(({port}) => {
      port.postMessage({ src, dst, t: 'msg', action, arg });
    });
  }

  msg = this._msg.bind(undefined, 0);

/** 
 * A destination is composed of multiple subdestinations separated by semicolons.
 * A connection receives a message if it is part of any subdestination.
 * A subdestination is composed of multiple conditions separated by periods.
 * A connection is part of a subdestination if it satisfies all its conditions.
 * This is conceptually akin to a conjunctive normal form (OR of AND) boolean formula.
 * getStringTargets should not include the local node as that is handled by a separate
 * local action handler.
 */
  getStringTargets = (dst: string): Connection[] => {
    /** Returns true if the given connection is part of the destination, else false */
    const predicate = (connection: Connection): boolean => {
      if (connection.closed) return false;
      for (const subDst of dst.split(';')) {
        const allConditionsMet = subDst.split('.').map<boolean>((condition) => {
          if (connection.subs.includes(condition)) {
            return true;
          }
          if (condition === 'topFrame') {
            return connection.frameId === 0;
          }
          if (condition === 'childFrames') {
            return connection.frameId !== 0;
          }
          const tabCondition = condition.match(/tab\[(\d+)\]/);
          if (tabCondition) {
            return connection.tabId === parseInt(tabCondition[1], 10);
          }
          const frameCondition = condition.match(/frame\[(\d+)\]/);
          if (frameCondition) {
            return connection.frameId === parseInt(frameCondition[1], 10);
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

  _getRemote = (connection: Connection, src: number, dst: Destination,
    action: string, arg: any): Promise<GetResult> => {
    return new Promise<GetResult>((resolve, reject) => {
      const tid = connection.transactions.new(resolve, reject);
      connection.port.postMessage({ t: 'get', src, dst, action,  arg, tid });
    });
  }

  _get = async (src: number, dst: Destination, action: string, arg: any): Promise<GetResult[]> => {
    const [targetSelf, targets] = this.getTargets(dst);
    const localResult: Array<Promise<GetResult>> = (targetSelf)
      ? [this._getLocal(src, action, arg)]
      : []
    const remoteResults = targets.map((target) =>
      this._getRemote(target, src, dst, action, arg)
    )

    // TODO: Proper Promise handling (don't fail if any fails)
    return Promise.all([...localResult, ...remoteResults]);
  }

  get = this._get.bind(undefined, 0);

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
  messageListener = ({ src, dst, t, action, arg, tid, res }: Message, port: chrome.runtime.Port) => {
    if (src === undefined) src = (<Connection> this.connections.getByPort(port)).id;
    switch (t) {
      case 'msg':
        this._msg(src, dst, action, arg);
        break;
      case 'get':
        this._get(src, dst, action, arg).then((result) => {
          port.postMessage({ t: 'rsp', res: result, tid});
        });
        break;
      case 'rsp':
        const connection = this.connections.getByPort(port);
        if (connection) {
          connection.transactions.complete(<number> tid, res);
        } else {
          console.error('ERROR SILLY PORT')
        }
        break;
      default:
        console.error(`ERROR: Invalid message class: ${t}`);
        break;
    }
  }

  senderDetails = (src: number) => {
    const srcDetails = this.connections.getById(src);
    return srcDetails
      ? srcDetails.port.sender
      : undefined;
  }

  actionHandler = (action: string, arg: any, src: number) => {
    const handler = this.actions[action] || this.errorHandler(action);
    return handler(arg, src, this.senderDetails(src));
  }

  errorHandler = (action: string) => (arg: any) => {
    console.error(`ERROR: No action type ${action}`);
  }
}

const node = new Core();
const init = node.init;
const msg = node.msg;
const get = node.get;
const con = node.connections.getById;
export { init, msg, con, get };
