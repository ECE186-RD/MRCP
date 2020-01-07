AFRAME.registerComponent('panel', {
    init: function () {
      this.parent = this.el.parentElement.object3D;
      console.log(this.parent);
      this.canvas = document.querySelector('canvas');
      this.children = [].slice.call(this.el.children);
      for(let child of this.children){
        document.body.insertBefore(child, document.body.firstChild);
      };
    },
    tick: function(time, timeDelta){
    const canvas = this.canvas;
    const parent = this.parent;
    for(let child of this.children){
      let obj = new THREE.Object3D();
      let offset=child.dataset.offset.split(" ");
      obj.position.set(offset[0], offset[1], offset[2]);
      parent.add(obj);
      let pos = toScreenPosition(obj, canvas);
      scale = getScreenScale(1/parent.position.length())*4;
      if(pos.x != NaN){
        child.style.transform = `translate(-50%, -50%) translate(${pos.x}px,${pos.y}px) scale(${scale})`;
      }
      if(parent.visible == true){
        child.style.display="flex";
      }else{
        child.style.display="none";
      }
    };
      },
  });

  //toScreenPosition from https://stackoverflow.com/questions/27409074/converting-3d-position-to-2d-screen-position-r69

  function toScreenPosition(obj,  canvas)
{
    var vector = new THREE.Vector3();

    var widthHalf = 0.5*canvas.clientWidth;
    var heightHalf = 0.5*canvas.clientHeight;

    obj.updateMatrixWorld();
    vector.setFromMatrixPosition(obj.matrixWorld);
    vector.project(AFRAME.scenes[0].camera);

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = - ( vector.y * heightHalf ) + heightHalf;

    return { 
        x: vector.x,
        y: vector.y
    };

};

//getScreenScale from https://stackoverflow.com/questions/13350875/three-js-width-of-view/13351534#13351534
function getScreenScale(dist){
  var camera = AFRAME.scenes[0].camera;
  var vFOV = THREE.Math.degToRad( camera.fov ); // convert vertical fov to radians
  var height = 2 * Math.tan( vFOV / 2 ) * dist; // visible height
  var width = height * camera.aspect;           // visible width

  return width;
}