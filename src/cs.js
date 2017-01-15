import { Node } from './node';
class CS extends Node {
    constructor() {
        super(...arguments);
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
         * page
         */
        this.msg = (dst, action, arg) => {
            if (dst === 0) {
                this.actionHandler(action)(arg, 0);
            }
            else {
                this.port.postMessage({
                    // src, -- src missing because only background page populates src
                    dst,
                    t: 'msg',
                    action,
                    arg
                });
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
        this.messageListener = ({ src, dst, t, action, arg }, port) => {
            switch (t) {
                case 'msg':
                    this.actionHandler(action)(arg, src);
                    return;
                case 'get':
                    console.error('ERROR: Not yet implemented');
                    return;
                case 'rsp':
                    console.error('ERROR: Not yet implemented');
                    return;
                default:
                    console.error(`ERROR: Invalid message class: ${t}`);
                    return;
            }
        };
    }
}
const node = new CS();
const init = node.init;
const msg = node.msg;
// const get = node.get;
export { init, msg };
