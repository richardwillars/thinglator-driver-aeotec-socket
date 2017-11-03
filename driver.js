let nodeIdCache = {};
const socketsThatAreOn = {};

const getNodeId = (deviceId) => {
  let foundNodeId = null;
  Object.keys(nodeIdCache).forEach((nodeId) => {
    if (nodeIdCache[nodeId] === deviceId) {
      foundNodeId = nodeId;
    }
  });
  return foundNodeId;
};

const initDevices = async (devices, commsInterface) => {
  nodeIdCache = {};
  devices.forEach((device) => {
    commsInterface.claimNode('thinglator-driver-aeotec-socket', device.specs.originalId);
    nodeIdCache[device.specs.originalId] = device._id;
  });
};

const discover = async (commsInterface, events) => {
  const unclaimedNodes = await commsInterface.getUnclaimedNodes();
  unclaimedNodes.forEach((node) => {
    if ((node.manufacturer === 'Aeotec') && (node.product === 'ZW075 Smart Switch Gen5')) {
      commsInterface.claimNode('thinglator-driver-aeotec-socket', node.nodeid);
    }
  });

  const claimedNodes = await commsInterface.getNodesClaimedByDriver('thinglator-driver-aeotec-socket');

  const devices = [];
  claimedNodes.forEach((node) => {
    devices.push({
      originalId: node.nodeid,
      name: node.product,
      commands: {
        on: true,
        off: true,
      },
      events: {
        [events.ON]: true,
        [events.ENERGY]: true,
      },
    });
  });
  return devices;
};

const processIncomingEvent = (info, createEvent, events) => {
  if (info.comclass === 50 && info.index === 8) {
    createEvent(events.ENERGY, nodeIdCache[info.nodeId], {
      energy: parseFloat(info.value),
    });
    // the socket transmits energy events even when it's turned off. Check the energy value is > 0
    if ((typeof socketsThatAreOn[info.nodeId] === 'undefined') && (parseFloat(info.value) > 0)) {
      // transmit an ON event
      createEvent(events.ON, nodeIdCache[info.nodeId], {
        on: true,
      });
      socketsThatAreOn[info.nodeId] = true;
    }
  } else if (info.comclass === 50 && info.index === 32) {
    createEvent(events.ON, nodeIdCache[info.nodeId], {
      on: false,
    });
    delete socketsThatAreOn[info.nodeId];
  }
};

const commandOn = async (device, commsInterface, createEvent, events) => {
  const nodeId = getNodeId(device._id);
  await commsInterface.setValue(nodeId, 37, 1, 0, 255);
  createEvent(events.ON, nodeIdCache[nodeId], {
    on: true,
  });
};

const commandOff = async (device, commsInterface, createEvent, events) => {
  const nodeId = getNodeId(device._id);
  await commsInterface.setValue(nodeId, 37, 1, 0, 0);
  createEvent(events.ON, nodeIdCache[nodeId], {
    on: false,
  });
};


module.exports = async (getSettings, updateSettings, commsInterface, events, createEvent, eventEmitter) => {
  eventEmitter.on('thinglator-driver-aeotec-socket', e => processIncomingEvent(e, createEvent, events));

  return {
    initDevices: async devices => initDevices(devices, commsInterface),
    authentication_getSteps: [],
    discover: async () => discover(commsInterface, events),
    command_on: async device => commandOn(device, commsInterface, createEvent, events),
    command_off: async device => commandOff(device, commsInterface, createEvent, events),
  };
};
