

# msg: client to core

```typescript
interface Message {
  t: string;          // type of message (set to "msg")
  dst: Destination;   // target identifier
  action: string;     // action to be triggered
  arg?: any;          // argument, if any
};
```

Clients don't know their id, and so can't supply the src id. The background page populates it on receipt of a message.


# msg: core to client

```typescript
interface Message {
  t: string;          // type of message (set to "msg")
  src: number;        // id of node that initiated msg
  action: string;     // action to be triggered
  arg?: any;          // argument, if any
};
```

Message remains intact, except that the backgroudn port adds the src id.

# get: client to core

```typescript
export interface Message {
  t: string;          // type of message (set to "get")
  dst: Destination;   // target identifier
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
  res: any;           // result
  tid: number;        // transaction identifier
};
```

# get: core to client

```typescript
export interface Message {
  t: string;          // type of message (set to "get")
  src: number;        // id of src node response is sent back to
  dst: Destination;   // target identifier
  action: string;     // action to be triggered
  arg?: any;          // argument, if any
  tid: number;        // transaction identifier
};
```

# rsp: client to core

```typescript
export interface Message {
  t: string;          // type of message (set to "rsp")
  src: number;        // id of src node response is sent back to
  res: any;           // result
  tid: number;        // transaction identifier
};
```