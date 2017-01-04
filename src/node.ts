export type Action = (arg: any) => void;
export type ActionsGenerator = (src: string) => { [key: string]: Action };
export type ActionHandler = (type: string) => Action;
export interface Messager { (type: string, arg?: any): void; }
export interface Communicator { msg(type: string, arg?: any): void; }

type Message = { src: string, dst: string, t: string, type: string, arg?: any };
type MessageListener = (message: Message, port: chrome.runtime.Port) => void;

abstract class Node {

  actions: ActionsGenerator;
  subs: string[];

  errorHandler = (type: string) => (arg: any) => {
    console.error(`No action type ${type} sent with arg:`, arg);
  }
  actionHandlerCreator: (src: string) => ActionHandler = (src) => (type) =>
    this.actions(src)[type] || this.errorHandler(type);

  abstract disconnectListener: (port: chrome.runtime.Port) => void;
  messageListener = ({ src, dst, t, type, arg }: Message, port: chrome.runtime.Port) => {
    switch (t) {
      case "msg":
        this.communicator(src)(dst)[t](type, arg); return;
      default:
        console.error(`Invalid message class: ${t}`); return;
    }
  }

  abstract defaultCommunicator: (src: string) => (dst: string) => Communicator;
  abstract specialCommunicators: (src: string) => { [key: string]: Communicator };
  localCommunicator: Communicator = {
    msg: (type, arg) => this.actionHandlerCreator(this.id)(type)(arg)
  };

  abstract init: (actions: ActionsGenerator, subscriptions: string[]) => void;

  communicator = (src: string) => (dst: string): Communicator => {
    return this.specialCommunicators(src)[dst] ||
      (this.subs.includes(dst) && this.localCommunicator) ||
      this.defaultCommunicator(src)(dst);
  }

  abstract id: string;
};

export default Node;
