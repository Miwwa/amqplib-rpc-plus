const uuid         = require('node-uuid'),
      parsers      = require('./message-parsers'),
      TimeoutError = require('./timout-error');

var singleton = null;

class Producer {
  constructor (amqp) {
    this._amqp        = amqp;
    this._rpcQueue    = null;
    this._rpcWaitings = new Map();
  }

  _createRpcQueue () {
    return new Promise(resolve => {
      if (this._rpcQueue)
        return resolve(this._rpcQueue);

      this._rpcQueue = `${this._amqp._options.hostname}:res`;

      return this._amqp.channel
      .then(channel => {
        return channel.assertQueue(this._rpcQueue, {durable: true, exclusive: true});
      })
      .then(_queue => {
        this._rpcQueue = _queue.queue;
        this._amqp.channel
        .then(channel => {
          channel.consume(this._rpcQueue, (msg) => {
            return this.mayBeAnswer(msg)
          }, {noAck: true});
        });

        return resolve(this._rpcQueue);
      });
    });
  }

  mayBeAnswer (msg) {
    let corrId     = msg.properties.correlationId;
    let resPromise = this._rpcWaitings.get(corrId);
    if (resPromise) {
      resPromise.resolve(parsers.in(msg));
      this._rpcWaitings.delete(corrId);
    }
  }

  publishOrSendToQueue (queue, msg, options) {
    if (!options.routingKey) {
      return this._amqp.channel.then(channel => channel.sendToQueue(queue, msg, options));
    } else {
      return this._amqp.channel.then(channel => channel.publish(queue, options.routingKey, msg, options));
    }
  }

  produce (queue, msg, options) {
    options = Object.assign({
      persistent: true,
      durable:    true,
      expiration: 5000
    }, options);
    if (!msg) msg = null;

    return new Promise(resolve => {
      if (options.rpc) {
        return this._createRpcQueue()
        .then(() => {

          let corrId            = uuid.v4();
          options.correlationId = corrId;
          options.replyTo       = this._rpcQueue;

          let p = Promise.defer();
          this._rpcWaitings.set(corrId, p);

          setTimeout(() => {
            let rpc = this._rpcWaitings.get(corrId);
            if (rpc) {
              rpc.reject(new TimeoutError(`message "${corrId}" timeout after ${options.expiration}`));
              this._rpcWaitings.delete(corrId);
            }
          }, options.expiration);

          //amqp expiration need be a string
          options.expiration = options.expiration.toString();
          this.publishOrSendToQueue(queue, parsers.out(msg, options), options);

          return resolve(this._rpcWaitings.get(corrId).promise);
        });
      } else {
        return resolve(this.publishOrSendToQueue(queue, parsers.out(msg, options), options));
      }
    })
    .catch(e => {
      throw e;
    });
  }
}

module.exports = function (amqp) {
  if (singleton === null)
    singleton = new Producer(amqp);

  return singleton;
};