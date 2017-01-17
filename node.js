;
export class Node {
  constructor () {
    this.actionHandler = (action) => this.actions[action] || this.errorHandler(action);
    this.errorHandler = (action) => (arg) => {
      console.error(`ERROR: No action type ${action}`);
    };
    this.getLocal = async (action, arg, id = 0) => [{ id, v: await this.actionHandler(action)(arg, 0) }];
  }
}
