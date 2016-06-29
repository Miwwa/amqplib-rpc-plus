const parsers = require('./message-parsers');

var singleton = null;

class Consumer {
  constructor (amqp) {
    this._amqp = amqp;
  }

  consume (queue, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options  = {persistent: true, durable: true};
    }

    this._amqp.channel.then(channel => {
      this._channel = channel;
      return this._channel.assertQueue(queue, options);
    })
    .then(_queue => {
      this._channel.consume(_queue.queue, msg => {
        return new Promise((resolve) => {
          return resolve(callback(parsers.in(msg)));
        })
        .catch(e => {
          return {
            isError: true,
            data: e.toString()
          }
        })
        .then(content => {
          return this._checkRpc(content.isError ? content : {data: content}, msg);
        })
        .then(() => {
          this._channel.ack(msg)
        })
        .catch(e => {
          e.msg = msg;
          throw e;
        })
      }, {noAck: false});

      return true;
    })
    .catch(e => {
      console.error(e);
      throw e;
    });
  }

  _checkRpc (content, msg) {
    return new Promise((resolve) => {
      if (msg.properties.replyTo) {
        let options = {
          correlationId: msg.properties.correlationId,
          persistent:    true,
          durable:       true
        };
        this._channel.sendToQueue(msg.properties.replyTo, parsers.out(content, options), options);
      }
      return resolve(msg);
    });
  }
}

module.exports = function (amqp) {
  if (singleton === null)
    singleton = new Consumer(amqp);

  return singleton;
};