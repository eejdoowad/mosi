type Action = (arg: any, src: number) => any;

type ActionDetails = {
  action: string;
  arg?: any;
  dst?: string;
}

/** Initializes Mosi's messaging system */
export declare function init(
  config: {
    log?: boolean;
    subscriptions?: string[];
    actions: { [key: string]: Action };
    onConnect?: ActionDetails[];
    onDisconnect?: ActionDetails[];
  }
): void;

/** Message the target node(s) */
export declare function msg(target: number | string, action: string, arg?: any): void;

/** Message the target node(s) and fetches the response(s) */
export declare function get(target: number | string, action: string, arg?: any, timeout?: number): Promise<{
  id: number
  v?: any;
  e?: any;
}[]>;

/** Returns information about a connection */
export declare function meta(connectionId: number): {
  frameId: number
  tabId: number
  sender: chrome.runtime.MessageSender,
  subs: string[],
  data: any
}
