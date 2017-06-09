class AeotecSwitch {
    constructor() {
        this.driverSettings = {};
        this.nodeIdCache = {};
        this.commsInterface = null;
        this.processIncomingEvent = this.processIncomingEvent.bind(this);
    }
    init(driverSettingsObj, commsInterface, eventEmitter) {
        this.driverSettingsObj = driverSettingsObj;

        this.eventEmitter = eventEmitter;
        this.commsInterface = commsInterface;
        return this.driverSettingsObj.get().then((settings) => {
            this.driverSettings = settings;

            this.commsInterface.getValueChangedEventEmitter().on('aeotec-socket', this.processIncomingEvent);
        });
    }

    getName() {
        return 'aeotec-socket';
    }

    getType() {
        return 'switch';
    }

    getInterface() {
        return 'zwave';
    }

    getEventEmitter() {
        return this.eventEmitter;
    }

    getNodeId(deviceId) {
        let foundNodeId = null;
        Object.keys(this.nodeIdCache).forEach((nodeId) => {
            if (this.nodeIdCache[nodeId] === deviceId) {
                foundNodeId = nodeId;
            }
        });
        return foundNodeId;
    }

    initDevices(devices) {
        return Promise.resolve().then(() => {
            this.nodeIdCache = {};
            devices.forEach((device) => {
                this.commsInterface.claimNode('aeotec-socket', device.specs.deviceId);
                this.nodeIdCache[device.specs.deviceId] = device._id;
            });
        });
    }

    getAuthenticationProcess() {
        return [];
    }

    discover() {
        return this.commsInterface.getUnclaimedNodes().then((nodes) => {
            nodes.forEach((node) => {
                if ((node.manufacturer === 'Aeotec') && (node.product === 'ZW075 Smart Switch Gen5')) {
                    this.commsInterface.claimNode('aeotec-socket', node.nodeid);
                }
            });

            return this.commsInterface.getNodesClaimedByDriver('aeotec-socket');
        }).then((nodes) => {
            const devices = [];
            nodes.forEach((node) => {
                devices.push({
                    deviceId: node.nodeid,
                    name: node.product,
                    commands: {
                        on: true,
                        off: true
                    },
                    events: {
                        on: true,
                        energy: true
                    }
                });
            });
            return devices;
        });
    }

    command_on(device) { // eslint-disable-line camelcase
        const nodeId = this.getNodeId(device._id);
        return this.commsInterface.setValue(nodeId, 37, 1, 0, 255).then(() => {
            this.eventEmitter.emit('on', 'aeotec-socket', this.nodeIdCache[nodeId], {
                on: true
            });
        });
    }

    command_off(device) { // eslint-disable-line camelcase
        const nodeId = this.getNodeId(device._id);
        return this.commsInterface.setValue(nodeId, 37, 1, 0, 0).then(() => {
            this.eventEmitter.emit('on', 'aeotec-socket', this.nodeIdCache[nodeId], {
                on: false
            });
        });
    }

    processIncomingEvent(event) {
        if (event.comclass === 50 && event.index === 8) {
            this.eventEmitter.emit('energy', 'aeotec-socket', this.nodeIdCache[event.nodeId], {
                energy: parseFloat(event.value)
            });
        }
    }

}

module.exports = AeotecSwitch;
