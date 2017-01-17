import { Node } from './node';
class Connections {
  constructor () {
    this.connectionsByPort = new Map();
    this.connectionsById = new Map();
    this.nextId = 2;
        /** Adds new connection, returning its id */
    this.add = (port, subs, onDisconnect) => {
            /** browser action, page actions, devtools won't have tabId or frameId */
      const sender = port.sender;
      let tabId;
      if (sender.tab) {
        tabId = sender.tab.id;
      }
      const frameId = sender.frameId;
            /** client ids start at 2: 0 refers to self, 1 refers to core */
      const id = this.nextId++;
      const connection = { port, id, subs, onDisconnect, tabId, frameId };
      this.connectionsByPort.set(port, connection);
      this.connectionsById.set(id, connection);
      return id;
    };
    this.remove = (port) => {
      this.connectionsById.delete(this.connectionsByPort.get(port).id);
      this.connectionsByPort.delete(port);
    };
    this.getByPort = (port) => this.connectionsByPort.get(port);
    this.getById = (id) => this.connectionsById.get(id);
  }
}
class Core extends Node {
  constructor () {
    super(...arguments);
        // connections: Connection[] = [];
    this.connections = new Connections();
        /**
         * The background page doubles as the Communication Administrator. It must:
         * 1. Run its own onConnect actions on init.
         * 2. Run every other node's onConnect actions when they connect.
         * 3. Run every other node's onDisconnect actions when they disconnect.
         * 4. Never execute its own onDisconnect handlers because it should never disconnect.
         * 5. Maintain information about itself.
         * 6. Maintain information about active connections.
         */
    this.init = ({ subscriptions = [], onConnect = [], onDisconnect = [], actions }) => {
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
    };
    this.executeOnConnectionActions = (src, actionDetails) => {
      actionDetails.forEach(({ action, arg, dst = 0 }) => {
        this._msg(src, dst, action, arg);
      });
    };
        /**
         * If the destination includes the current node, execute the action locally.
         * Also send an action message to every other destination node.
         * TODO: CLEAN THIS UP
         */
    this._msg = (src, dst, action, arg) => {
      let targetSelf = false;
      let targets = [];
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
      if (targetSelf) { this.actionHandler(action)(arg, src); }
      targets.forEach(({ port }) => {
        port.postMessage({ src, dst, t: 'msg', action, arg });
      });
    };
    this.msg = this._msg.bind(undefined, 0);
        /**
         * A destination is composed of multiple subdestinations separated by semicolons.
         * A connection receives a message if it is part of any subdestination.
         * A subdestination is composed of multiple conditions separated by periods.
         * A connection is part of a subdestination if it satisfies all its conditions.
         * This is conceptually akin to a conjunctive normal form (OR of AND) boolean formula.
         * getTargets should not include the local node as that is handled by a separate
         * local action handler.
         */
    this.getTargets = (dst) => {
            /** Returns true if the given connection is part of the destination, else false */
      const predicate = (connection) => {
        if (connection.closed) {
          return false;
        }
        for (const subDst of dst.split(';')) {
          const allConditionsMet = subDst.split('.').map((condition) => {
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
          if (allConditionsMet) { return true; }
        }
        return false;
      };
            // TODO: review perfomance cost of array conversion, perhaps rewrite to avoid conversion
      return [...this.connections.connectionsById.values()].filter(predicate);
    };
    this.get = async (dst, action, arg) => {
      if (dst === 0) {
        return await this.getLocal(action, arg);
      } else {
        return Promise.resolve(['meow']);
      }
    };
        /**
         * Executes onDisconnt actions and deletes data associated with connection.
         * Connection is marked as closed so that no messages are sent to it when executing
         * onDisconnect actions.
         */
    this.disconnectListener = (port) => {
      const connection = this.connections.getByPort(port);
      connection.closed = true;
      this.executeOnConnectionActions(connection.id, connection.onDisconnect);
      this.connections.remove(port);
    };
    this.messageListener = ({ src, dst, t, action, arg, tid }, port) => {
      if (src === undefined) {
        src = this.connections.getByPort(port).id;
      }
      switch (t) {
        case 'msg':
          this._msg(src, dst, action, arg);
          return;
        case 'get':
          if (dst === 1) {
            this.getLocal(action, arg, 1).then((res) => {
              port.postMessage({ t: 'rsp', res, tid });
            });
          }
          return;
        case 'rsp':
          return;
        default:
          console.error(`ERROR: Invalid message class: ${t}`);
          return;
      }
    };
  }
}
const node = new Core();
const init = node.init;
const msg = node.msg;
const get = node.get;
const con = node.connections.getById;
export { init, msg, con, get };
