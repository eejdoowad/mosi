interface Action {
    (arg?: any): void;
}
interface Communicator {
    msg(type: string, arg?: any): void;
}
export declare function init(actions: (src: string) => { [key: string]: Action }, subscriptions?: string[]): void;
export declare function net(dst: string): Communicator;