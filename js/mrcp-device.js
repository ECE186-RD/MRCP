class MRCPNode{

  constructor(){
    this.device_authenticated = false;
    this.bypass_security = true;
    this.device_token = 'invalid';
    this.rx_str = '';
  }

  onRead(){
    console.log("Recieved Value: " + JSON.stringify(this.rx_doc));
    if(this.rx_doc['type'] == 'SYN_ACK'){
      this.authenticateDevice(this.rx_doc);
    }
  }

  async BLEconnect(){
    var callback = (event)=>{
      let decoder = new TextDecoder("utf-8");
      let rx_value = decoder.decode(event.target.value);
      this.rx_str += rx_value;
      if(this.rx_str[this.rx_str.length - 1] == '}'){
        this.rx_doc = JSON.parse(this.rx_str);
        this.rx_str = "";
        this.onRead(this.rx_doc);
      }
    };
    try {
      console.log('Requesting Bluetooth Device...');
      this.device  = await navigator.bluetooth.requestDevice({
          filters: [{services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']}]});
          //acceptAllDevices: true, optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']});
    
      console.log('Connecting to GATT Server...');
      const server = await this.device.gatt.connect();
    
      console.log('Getting Service...');
      const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
    
      console.log('Getting Characteristic TX...');
      this.characteristic_tx = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');

      console.log('Getting Characteristic RX...');
      this.characteristic_rx = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
      this.characteristic_rx.addEventListener('characteristicvaluechanged', callback);
      this.characteristic_rx.startNotifications();
      console.log('Done');

    } catch(error) {
      console.log(error);
    }
    return Promise.resolve();
  }

  authenticateDevice(doc){
    if(this.bypass_security){
      console.log("Device Authenticated");
      this.device_authenticated = true;
      this.writeCharacteristic(this, JSON.stringify({'type':'ACK'}));
    }else{
      firebase.database().ref('users/' + firebase.auth().currentUser.uid).set({
        authToken: 'invalid'
      });
      firebase.database().ref('/users/' + doc['uid'] + '/authToken').once('value').then(function(snapshot) {
        this.device_token = snapshot.val();
        if(this.device_token != 'invalid' && this.device_token == doc['token']){
          console.log("Device Authenticated");
          this.device_authenticated = true;
          this.writeCharacteristic(this, JSON.stringify({'type':'ACK'}));
        }else{
          console.log("Device Authentication Failed");
        }
      }.bind(this));
    }
  }


  async writeCharacteristic(node, value){
    let encoder = new TextEncoder('utf-8');
    console.log('Writing Characteristic: ' + value);
    value = encoder.encode(value.toString());
    await node.characteristic_tx.writeValue(value);
  }

  async buttonPress(button){
    this.button = button;
    if(this.device == null){
      this.button.innerHTML = "Connecting";
      await this.BLEconnect();
      var token = uuidv1();
      firebase.database().ref('users/' + firebase.auth().currentUser.uid).set({
        authToken: token
      });
      setTimeout(this.writeCharacteristic, 100, this, JSON.stringify({'type':'SYN', 'token':token, 'uid': firebase.auth().currentUser.uid}));
      this.button.innerHTML = 'Loading';
    }
  }
}

class MRCPLock extends MRCPNode{

  constructor(){
    super();
    this.status = document.querySelector('#device_status');
  }

  onRead(){
    super.onRead();
    if(this.device_authenticated){
      if(this.rx_doc['type'] == "UI_INFO" || this.rx_doc['type'] == "LED_STATE" ){
        this.status.style.display = 'block';
        this.led_on = this.rx_doc['led_state'] == 'on';
        this.button.innerHTML = this.led_on ? 'UNLOCK' : 'LOCK';
        this.status.style.backgroundColor = this.led_on ? '#39cc39' : '#ff5757';
      }
    }
  }

  async buttonPress(button){
    super.buttonPress(button);
    if(this.device && this.device_authenticated){
      this.writeCharacteristic(this, JSON.stringify({'type': 'LED_CMD', 'led_cmd': (this.led_on ? 'off' : 'on')}));
    }
  }

}

class MRCPMeter extends MRCPNode{

  constructor(){
    super();
    this.rate = document.querySelector('#meter_rate');
    this.duration = document.querySelector('#meter_duration');
    this.total = document.querySelector('#meter_total');
    this.connected = document.querySelector('#meter_connected');
    this.connected.style.display = "none";
    this.time_started = false;
  }

  onRead(){
    super.onRead();
    if(this.device_authenticated){
      if(this.rx_doc['type'] == "UI_INFO"){
        this.rate.innerHTML = this.rx_doc['rate'].toFixed(2);
        var connected = document.querySelector('#meter_connected');
        connected.style.display = "block";
        this.button.innerHTML = "Start";
      }else if(this.rx_doc['type'] == "START_ACK"){
        this.time_started = true;
        this.startTimer();
        var started = document.querySelector('#meter_started');
        started.style.display = "block";
        this.button.style.display = 'none';
      }else if(this.rx_doc['type'] == "STOP"){
        this.time_started = false;
        var started = document.querySelector('#meter_started');
        clearInterval(this.timer_interval);
        this.UpdateTimer(this, this.rx_doc['duration']);
        this.button.innerHTML = "Start";
        this.button.style.display = 'block';
        this.writeCharacteristic(this, JSON.stringify({'type':'STOP_ACK'}));
      }else if(this.rx_doc['type'] == "ERROR"){
        this.button.innerHTML = "Connect";
        this.device = null;
      }
    }
  }

  async buttonPress(button){
    super.buttonPress(button);
    if(this.device){
      if(!this.time_started){
        this.writeCharacteristic(this, JSON.stringify({'type':'START'}));
        this.button.innerHTML = 'Loading';
      }
    }
  }

  UpdateTimer(meter, overrideDiff = null){
    meter.updatedTime = new Date().getTime();
    var difference = 0;
    if (meter.savedTime){
      difference = (meter.updatedTime - meter.startTime) + meter.savedTime;
    } else {
      difference =  meter.updatedTime - meter.startTime;
    }
    if(overrideDiff){
      difference = overrideDiff;
    }
    var hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((difference % (1000 * 60)) / 1000);
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    meter.duration.innerHTML = hours + ':' + minutes + ':' + seconds;
    meter.total.innerHTML = (parseFloat(meter.rate.innerHTML)*(difference / (1000 * 60 * 60))).toFixed(2);
  }

  startTimer(){
      this.startTime = new Date().getTime();
      this.timer_interval = setInterval(this.UpdateTimer, 1000, this);   
  }

}

class MRCPVendingMachine{

  async BLEconnect(){
    var callback = (event)=>{
      let decoder = new TextDecoder("utf-8");
      this.led_on = parseInt(decoder.decode(event.target.value)) == 1;
      this.button.innerHTML = this.led_on ? 'OFF' : 'ON';
  };
    try {
      console.log('Requesting Bluetooth Device...');
      this.device  = await navigator.bluetooth.requestDevice({
          filters: [{services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']}]});
          //acceptAllDevices: true, optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']});
    
      console.log('Connecting to GATT Server...');
      const server = await this.device.gatt.connect();
    
      console.log('Getting Service...');
      const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
    
      console.log('Getting Characteristic TX...');
      this.characteristic_tx = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');

      console.log('Getting Characteristic RX...');
      this.characteristic_rx = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
      this.characteristic_rx.addEventListener('characteristicvaluechanged', callback);
      this.characteristic_rx.startNotifications();
      console.log('Done');
    } catch(error) {
      console.log(error);
    }
    return Promise.resolve();
  }


  async buttonPress(button){
    this.button = button;
    if(this.device == null){
      this.button.innerHTML = "Connecting";
      await this.BLEconnect();
    }else{
      let encoder = new TextEncoder('utf-8');
      let sendMsg = encoder.encode((this.led_on ? 'OFF' : 'ON').toString());
      console.log('Writing Characteristic...');
      this.button.innerHTML = 'Loading';
      await this.characteristic_tx.writeValue(sendMsg);
    }
  }

}

window.onload = ()=>{
  mrcp_lock = new MRCPLock();
  mrcp_meter = new MRCPMeter();
  mrcp_vending_machine = new MRCPVendingMachine();
};