const driver = require('./driver');

module.exports = {
  initialise: (settings, updateSettings, commsInterface, events, createEvent, eventEmitter) => driver(settings, updateSettings, commsInterface, events, createEvent, eventEmitter),
  driverType: 'socket',
  interface: 'zwave',
  driverId: 'thinglator-driver-aeotec-socket',
};
