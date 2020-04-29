  // Your web app's Firebase configuration
  var firebaseConfig = {
    apiKey: "AIzaSyBRF0142dYhN2Q8OxU0-k7h6ocv22SLHVE",
    authDomain: "mrcp-1dad5.firebaseapp.com",
    databaseURL: "https://mrcp-1dad5.firebaseio.com",
    projectId: "mrcp-1dad5",
    storageBucket: "mrcp-1dad5.appspot.com",
    messagingSenderId: "623056773926",
    appId: "1:623056773926:web:98c901d4088014bd9217e7",
    measurementId: "G-TGVR9RZRRS"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  firebase.analytics();

  console.log(firebase.auth().currentUser);

  if(firebase.auth().currentUser){
    window.location = "index.html";
  }else{
  }
