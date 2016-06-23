class ExtendableError extends Error {
  constructor (message) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;

    if (typeof Error.captureStackTree === 'function') {
      Error.captureStackTree(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}

class TimeoutError extends ExtendableError {
  constructor (message) {
    super(message);
  }
}

module.exports = TimeoutError;