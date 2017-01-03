export type Action = (arg: any) => void;
export type ActionsGenerator = (src: string) => { [key: string]: Action };
export type ActionHandler = (type: string) => Action;
export interface Messager { (type: string, arg?: any): void; }
export interface Communicator { msg(type: string, arg?: any): void; }

type Message = { src: string, dst: string, t: string, type: string, arg?: any };
type MessageListener = (message: Message, port: chrome.runtime.Port) => void;

abstract class Node {

  _actions: ActionsGenerator;
  errorHandler = (type: string) => (arg: any) => {
    console.error(`No action type ${type} sent with arg:`, arg);
  }
  actionHandlerCreator: (src: string) => ActionHandler = (src) => (type) =>
    this._actions(src)[type] || this.errorHandler(type);

  abstract disconnectListener: (port: chrome.runtime.Port) => void;
  messageListener = ({ src, dst, t, type, arg }: Message, port: chrome.runtime.Port) => {
    switch (t) {
      case "msg":
        this.communicator(src)(dst)[t](type, arg); break;
      default:
        console.error(`Invalid message class: ${t}`); break;
    }
  }

  abstract defaultCommunicator: (src: string) => (dst: string) => Communicator;
  abstract specialCommunicators: (src: string) => { [key: string]: Communicator };
  localCommunicator: Communicator = {
    msg: (type, arg) => this.actionHandlerCreator(this.id)(type)(arg)
  };

  abstract init: (actions: ActionsGenerator, subscriptions: string[]) => void;

  communicator = (src: string) => (dst: string): Communicator =>
  this.specialCommunicators(src)[dst] || this.defaultCommunicator(src)(dst);

  net = this.communicator(this.id);

  abstract id: string;
};

export default Node;
