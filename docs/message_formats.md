

# msg: client to core

```typescript
interface Message {
  dst: Destination;   // target identifier
  t: string;          // type of message (set to "msg")
  action: string;     // action to be triggered
  arg?: any;          // argument, if any
};
```

Clients don't know their id, and so can't supply the src id. The background page populates it on receipt of a message.


# msg: core to client

```typescript
interface Message {
  src: number;        // id of node that initiated msg
  t: string;          // type of message (set to "msg")
  action: string;     // action to be triggered
  arg?: any;          // argument, if any
};
```

Message remains intact, except that the backgroudn port adds the src id.

# get: client to core

```typescript
export interface Message {
  dst: Destination;   // target identifier
  t: string;          // type of message (set to "get")
  action: string;     // action to be triggered
  arg?: any;          // argument, if any
  tid: number;        // transaction identifier
};
```

# rsp: core to client

```typescript
export interface Message {
//src: number         // not really needed
  t: string;          // type of message (set to "rsp")
  ret: any;           // return value, if any
  tid: number;        // transaction identifier
};
```

# get: core to client

```typescript
export interface Message {
  src: number;        // id of src node response is sent back to
  dst: Destination;   // target identifier
  t: string;          // type of message (set to "get")
  action: string;     // action to be triggered
  arg?: any;          // argument, if any
  tid: number;        // transaction identifier
};
```

# rsp: client to core

```typescript
export interface Message {
  src: number;        // id of src node response is sent back to
  t: string;          // type of message (set to "rsp")
  ret: any;           // return value, if any
  tid: number;        // transaction identifier
};
```