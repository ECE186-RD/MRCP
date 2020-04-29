
var provider = new firebase.auth.GoogleAuthProvider();

  function login(){
    var email = document.getElementById("emailField").value;
    var password = document.getElementById("passwordField").value;

    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(function() {
        return firebase.auth().signInWithEmailAndPassword(email, password);
    })
    .catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorCode);
        console.log(errorMessage);
    });
  }

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      window.location = 'mrcp-main.html';
    } else {
      
    }
  });