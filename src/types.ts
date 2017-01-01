type Action = (arg: any) => void;
type ActionsGenerator = (src: string) => { [key: string]: Action };
type ActionHandler = (type: string) => Action;
type Messager = (type: string, arg: any) => void;
type Communicator = { msg: Messager; };
type Message = { src: string, dst: string, t: string, type: string, arg?: any };
type MessageListener = (message: Message, port: chrome.runtime.Port) => void;
type Connection = {
  port: chrome.runtime.Port,
  subs: string[]
};