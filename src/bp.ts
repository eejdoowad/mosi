import{ ActionDetails, Communicator, Config, Node  } from './node';

interface Connection {
  id: string;
  port: chrome.runtime.Port;
  subs: string[];
  onDisconnect: ActionDetails[];
  tabId: number;
  frameId: number;
}

class BP extends Node {

  connections: Connection[] = [];

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
    this.id = 'bp';
    this.subscriptions = ['self', this.id, ...subscriptions];
    this.actions = actions;
    chrome.runtime.onConnect.addListener((port) => {
      const { id, subs, onConnect: onC, onDisconnect: onD } = JSON.parse(port.name);
      this.connections.push({
        id, port, subs, onDisconnect: onD,
        tabId:   <number> (<chrome.tabs.Tab> (<chrome.runtime.MessageSender> port.sender).tab).id,
        frameId: <number> (<chrome.runtime.MessageSender> port.sender).frameId
      });
      port.onDisconnect.addListener(this.disconnectListener);
      port.onMessage.addListener(this.messageListener);
      this.executeConnectionActions(id, onC);
    });
    this.executeConnectionActions(this.id, onConnect);
  }

  executeConnectionActions = (src: string, actionDetails: ActionDetails[]) => {
    this.src = src;
    actionDetails.forEach(({ action, arg, dst = 'bp' }) => {
      this.net(dst).msg(action, arg);
    });
  }

  /** 
   * If the destination includes the current node, execute the action locally.
   * Also send an action message to every destination node.
   */
  net = (dst: string): Communicator => {
    const targetSelf = this.subscriptions.includes(dst);
    const targets = this.getTargets(dst);
    return {
      msg: (type, arg) => {
        if (targetSelf) this.actionHandler(type)(arg);
        targets.forEach(({port}) => {
          port.postMessage({
            src: this.src,
            dst,
            t: 'msg',
            type,
            arg
          });
        });
      }
    };
  }

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
      dst.split(';').forEach((subDst) => {
        const allConditionsMet = subDst.split('.').map<boolean>((condition) => {
          if (condition === 'self' || condition === this.id) {
            return false;
          }
          if (condition === 'topFrame') {
            return connection.frameId === 0;
          }
          if (condition === 'childFrames') {
            return connection.frameId !== 0;
          }
          if (connection.subs.includes(condition)) {
            return true;
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
      });
      return false;
    };
    return this.connections.filter(predicate);
  }

  /**
   * Removes the port from the managed connections and executes onDisconnt actions
   * src is set to the background page to avoid messaging the disconnected page
   */
  disconnectListener = (port: chrome.runtime.Port): void => {
    const i = this.connections.findIndex((connection) => port === connection.port);
    const onDisconnect = this.connections[i].onDisconnect;
    this.connections.splice(i, 1);
    this.executeConnectionActions(this.id, onDisconnect);
  }
}

const node = new BP();
const init = node.init;
const net = node.net;
const src = () => node.src;
export { init, net, src};
