module.exports = function (options) {
  const amqp = require('./src/amqp')(options);

  return {
    consumer: require('./src/consumer')(amqp),
    producer: require('./src/producer')(amqp)
  }
};