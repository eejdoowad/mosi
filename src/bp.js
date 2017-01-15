import { Node } from './node';
class BP extends Node {
    constructor() {
        super(...arguments);
        this.connections = [];
        /**
         * Generates incrementing number Ids starting with 2 because
         * 0 is reserved for self, 1 is reserved for the bp
         */
        this.nextId = 2;
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
                const id = this.nextId++;
                const { subs, onConnect: onC, onDisconnect: onD } = JSON.parse(port.name);
                /** browser action, page actions, devtools won't have tabId or frameId */
                const sender = port.sender;
                let tabId;
                if (sender.tab)
                    tabId = sender.tab.id;
                const frameId = sender.frameId;
                /** TODO: determine cost of unshift vs push */
                this.connections.push({ port, id, subs, onDisconnect: onD, tabId, frameId });
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
                targetSelf = dst === 0 || dst === 1;
                targets = this.connections.filter((c) => c.id === dst);
            }
            else {
                targetSelf = this.subscriptions.includes(dst);
                targets = this.getTargets(dst);
            }
            if (targetSelf)
                this.actionHandler(action)(arg, src);
            targets.forEach(({ port }) => {
                port.postMessage({
                    src,
                    dst,
                    t: 'msg',
                    action,
                    arg
                });
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
                    if (allConditionsMet)
                        return true;
                }
                return false;
            };
            return this.connections.filter(predicate);
        };
        /**
         * Removes the port from the managed connections and executes onDisconnt actions
         * src is set to the background page to avoid messaging the disconnected page
         */
        this.disconnectListener = (port) => {
            const i = this.connections.findIndex((connection) => port === connection.port);
            const onDisconnect = this.connections[i].onDisconnect;
            this.connections.splice(i, 1);
            this.executeOnConnectionActions(0, onDisconnect);
        };
        this.messageListener = ({ src, dst, t, action, arg }, port) => {
            if (src === undefined) {
                src = this.connections.filter((c) => c.port === port)[0].id;
            }
            switch (t) {
                case 'msg':
                    this._msg(src, dst, action, arg);
                    return;
                case 'get':
                    console.error('ERROR: Not yet implemented');
                    return;
                default:
                    console.error(`ERROR: Invalid message class: ${t}`);
                    return;
            }
        };
    }
}
const node = new BP();
const init = node.init;
const msg = node.msg;
// const get = node.get;
export { init, msg };
