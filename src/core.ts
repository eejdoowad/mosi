import { ActionDetails, Communicator, Config, Destination, Message, Node  } from './node';

interface Connection {
  port: chrome.runtime.Port;
  id: number;
  subs: string[];
  onDisconnect: ActionDetails[];
  tabId?: number;
  frameId?: number;
  closed?: boolean;
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
    const connection = { port, id, subs, onDisconnect, tabId, frameId }
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

class BP extends Node {

  // connections: Connection[] = [];
  connections = new Connections();

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

  /** 
   * If the destination includes the current node, execute the action locally.
   * Also send an action message to every other destination node.
   * TODO: CLEAN THIS UP
   */
  _msg = (src: number, dst: Destination, action: string, arg: any): void => {
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
      targets = this.getTargets(dst);
    } else {
      console.error('ERROR: dst type is invalid');
    }
    if (targetSelf) this.actionHandler(action)(arg, src);
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
 * getTargets should not include the local node as that is handled by a separate
 * local action handler.
 */
  getTargets = (dst: string): Connection[] => {
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

  messageListener = ({ src, dst, t, action, arg }: Message, port: chrome.runtime.Port) => {
    if (src === undefined) {
      src = (<Connection> this.connections.getByPort(port)).id
    }
    switch (t) {
      case 'msg':
        this._msg(src, dst, action, arg); return;
      case 'get':
        console.error('ERROR: Not yet implemented'); return;
      default:
        console.error(`ERROR: Invalid message class: ${t}`); return;
    }
  }
}

const node = new BP();
const init = node.init;
const msg = node.msg;
// const get = node.get;
const con = node.connections.getById;
export { init, msg, con};
