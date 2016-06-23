const amqplib          = require('amqplib'),
      uuid             = require('node-uuid'),
      startedAt        = new Date(),
      hostnameFallback = uuid.v4();

let singleton = null;

class Amqp {
  constructor (options) {
    this._connection = null;
    this._channel    = null;

    this._options = Object.assign({
      host:         'amqp://guest:guest@localhost:5672',
      exchange:     'node-rpc-exchange',
      exchangeType: 'topic',
      //prefetch setting for consumer
      prefetch:     1,
      //generate a hostname so we can track this connection on the broker (rabbitmq management plugin)
      hostname:     process.env.HOSTNAME || process.env.USER || hostnameFallback
    }, options);
  }

  _getConnection () {
    if (this._connection)
      return Promise.resolve(this._connection);

    this._connection = amqplib.connect(this._options.host, {
      clientProperties: {
        hostname:    this._options.hostname,
        startedAt:   startedAt,
        connectedAt: new Date()
      }
    })
    .catch(e => {
      this._connection = null;
      throw e;
    })
    .then((connection) => {
      this._connection = connection;

      connection.on('close', () => {
        this._connection = null;
        console.warn('connection', this._options.host, 'closed');
      });
      connection.on('error', (err) => {
        this._connection.close();
        console.error('connection', this._options.host, err);
        throw err;
      });

      return connection;
    });
    return this._connection;
  }

  _getChannel () {
    if (this._channel)
      return Promise.resolve(this._channel);

    this._channel = this._connection.createChannel()
    .catch(e => {
      this._channel = null;
      throw e;
    })
    .then((channel) => {
      this._channel = channel;

      channel.on('close', () => {
        this._channel = null;
        console.warn('channel', this._options.host, 'closed');
      });
      channel.on('error', (err) => {
        this._channel.close();
        console.error('channel', this._options.host, err);
        throw err;
      });

      channel.prefetch(this._options.prefetch);
      // channel.assertExchange(this._options.exchange, this._options.exchangeType, {autoDelete: false});

      return channel;
    });
    return this._channel;
  }

  get connection () {
    return this._getConnection();
  }

  get channel () {
    return this._getConnection().then(() => this._getChannel())
  }
}

module.exports = (options) => {
  if (singleton === null) {
    singleton = new Amqp(options);
  }

  return singleton;
};