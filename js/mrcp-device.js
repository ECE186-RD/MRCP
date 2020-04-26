class MRCPLock{

  async BLEconnect(){
    var callback = (event)=>{
      var status = document.querySelector('#device_status');
      status.style.display = 'block';
      let decoder = new TextDecoder("utf-8");
      this.led_on = parseInt(decoder.decode(event.target.value)) == 1;
      this.button.innerHTML = this.led_on ? 'UNLOCK' : 'LOCK';
      status.style.backgroundColor = this.led_on ? '#39cc39' : '#ff5757';
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

class MRCPMeter{

  constructor(){
    this.rate = document.querySelector('#meter_rate');
    this.duration = document.querySelector('#meter_duration');
    this.total = document.querySelector('#meter_total');
    this.connected = document.querySelector('#meter_connected');
    this.connected.style.display = "none";
    this.time_started = false;
    console.log(this);
  }

  async BLEconnect(){
    var callback = (event)=>{
      let decoder = new TextDecoder("utf-8");
      let rx_value = decoder.decode(event.target.value);
      console.log("Recieved Value: " + rx_value);

      if(rx_value == "START"){
        this.time_started = true;
        this.startTimer();
        var started = document.querySelector('#meter_started');
        started.style.display = "block";
        this.button.style.display = 'none';
      }else if(rx_value == "STOP"){
        this.time_started = false;
        var started = document.querySelector('#meter_started');
        clearInterval(this.timer_interval);
        this.button.innerHTML = "Start";
        this.button.style.display = 'block';
      }else{
        this.rate.innerHTML = parseFloat(rx_value).toFixed(2);
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


  async buttonPress(button){
    this.button = button;
    if(this.device == null){
      this.button.innerHTML = "Connecting";
      await this.BLEconnect();

      var connected = document.querySelector('#meter_connected');
      connected.style.display = "block";
      this.button.innerHTML = "Start";
    }else{
      let encoder = new TextEncoder('utf-8');
      let sendMsg = "";
      if(this.time_started){
        sendMsg = encoder.encode(('STOP').toString());
      }else{
        sendMsg = encoder.encode(('START').toString());
      }
      console.log('Writing Characteristic...');
      this.button.innerHTML = 'Loading';
      await this.characteristic_tx.writeValue(sendMsg);
    }
  }

  UpdateTimer(meter){
    meter.updatedTime = new Date().getTime();
    var difference = 0;
    if (meter.savedTime){
      difference = (meter.updatedTime - meter.startTime) + meter.savedTime;
    } else {
      difference =  meter.updatedTime - meter.startTime;
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

