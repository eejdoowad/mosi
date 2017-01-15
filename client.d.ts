// interface Action {
//     (arg?: any): void;
// }
// interface Communicator {
//     msg(type: string, arg?: any): void;
// }
// export declare function init(actions: (src: string) => { [key: string]: Action }, subscriptions?: string[]): void;
// export declare function net(dst: string): Communicator;

type Action = (arg: any) => void;

interface ActionDetails {
  action: string;
  arg?: any;
  dst?: string;
}

interface Config {
  subscriptions?: string[];
  onConnect?: ActionDetails[];
  onDisconnect?: ActionDetails[];
  actions: { [key: string]: Action };
}

export declare function init(config: Config): void;

interface Communicator {
    msg(type: string, arg?: any): void;
}

export declare function net(dst: string): Communicator;

export declare function src(): string;
