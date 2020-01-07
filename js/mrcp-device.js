class MRCPLock{

  async BLEconnect(){
    var callback = (event)=>{
      var status = document.querySelector('#device_status');
      status.style.display = 'block';
      let decoder = new TextDecoder("utf-8");
      this.led_on = parseInt(decoder.decode(event.target.value)) == 1;
      this.button.innerHTML = this.led_on ? 'OFF' : 'ON';
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
mrcp_lock = new MRCPLock();