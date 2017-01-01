abstract class Node {

  protected _actions: ActionsGenerator;
  protected errorHandler = (type: string) => (arg: any) => {
    console.error(`No action type ${type} sent with arg:`, arg);
  };
  protected actionHandlerCreator: (src: string) => ActionHandler = (src) => (type) =>
    this._actions(src)[type] || this.errorHandler(type);

  protected abstract disconnectListener: (port: chrome.runtime.Port) => void;
  protected messageListener = ({ src, dst, t, type, arg }: Message, port: chrome.runtime.Port) => {
    switch (t) {
      case "msg":
        this.communicator(src)(dst)[t](type, arg); break;
      default:
        console.error(`Invalid message class: ${t}`); break;
    }
  };

  protected abstract defaultCommunicator: (src: string) => (dst: string) => Communicator;
  protected abstract specialCommunicators: (src: string) => { [key: string]: Communicator };
  protected localCommunicator: Communicator = {
    msg: (type, arg) => this.actionHandlerCreator(this.id)(type)(arg)
  };

  public abstract init: (actions: ActionsGenerator, subscriptions?: string[]) => void;

  private communicator = (src: string) => (dst: string): Communicator =>
  this.specialCommunicators(src)[dst] || this.defaultCommunicator(src)(dst);

  public net = this.communicator(this.id);

  public abstract id: string;

  public con = {
    DEFAULT: 0,
    PERSISTENT: 0,
    TEMPORARY: 1
  };
};

export default Node;
