;
export class Node {
    constructor() {
        this.nextTransactionId = 0;
        this.transactions = [];
        this.actionHandler = (action) => this.actions[action] || this.errorHandler(action);
        this.errorHandler = (action) => (arg) => {
            console.error(`ERROR: No action type ${action}`);
        };
    }
}
