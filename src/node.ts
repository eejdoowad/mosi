export type Action = (arg: any) => void;
// export type ActionsGenerator = (src: string) => { [key: string]: Action };
// export type ActionHandler = (type: string) => Action;
export interface Messager { (type: string, arg?: any): void; }
export interface Communicator { msg(type: string, arg?: any): void; }

type Message = { _src: string, _dst: string, _t: string, type: string, arg?: any };
type MessageListener = (message: Message, port: chrome.runtime.Port) => void;


export type ActionDetails = { action: string; arg?: any; dst?: string; };
export interface Config {
  subscriptions: string[];
  onConnect?: ActionDetails[];
  onDisconnect?: ActionDetails[];
  actions: { [key: string]: Action };
}

// this should really be part of the class... but is global so that it can be exported under the simple name src
// doesn't really matter since class is singleton
export let src: string = 'uninitialized';
export const setSrc = (newSrc: string) => { src = newSrc; }


abstract class Node {

  id: string;
  actions: { [key: string]: Action };
  subs: string[];
  net: Communicator;

  abstract initializeId(): void;
  abstract init: (config: Config) => void;
  abstract disconnectListener: (port: chrome.runtime.Port) => void;
  abstract defaultCommunicator: (dst: string) => Communicator;

  sharedInit = ({ subscriptions, onConnect, actions }: Config): void => {
    this.initializeId();
    this.net = this.communicator(this.id);
    this.subs = [this.id, ...subscriptions];
    this.actions = actions;
    if (onConnect) {
      onConnect.forEach((actionDetails) => {
        const { action = 'error', arg, dst = 'bp' } = actionDetails;
        src = this.id;
        this.communicator(this.id).msg(action, arg);
      });
    }
  }

  localCommunicator: Communicator = {
    msg: (type, arg) => this.actionHandler(type)(arg)
  };
  specialCommunicators: { [key: string]: Communicator } = {
    [this.id]: this.localCommunicator,
    self: this.localCommunicator
  };
  communicator = (dst: string): Communicator => {
    return this.specialCommunicators[dst] ||
      (this.subs.includes(dst) && this.localCommunicator) ||
      this.defaultCommunicator(dst);
  }

  errorHandler = (type: string) => (arg: any) => {
    console.error(`No action type ${type} sent with arg:`, arg);
  }
  actionHandler = (type: string): Action =>
    this.actions[type] || this.errorHandler(type);

  messageListener = ({ _src, _dst, _t, type, arg }: Message, port: chrome.runtime.Port) => {
    src = _src;
    switch (_t) {
      case 'msg':
        this.communicator(_dst)[_t](type, arg); return;
      default:
        console.error(`Invalid message class: ${_t}`); return;
    }
  }
};

export default Node;
