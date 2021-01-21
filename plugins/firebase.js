import firebase from 'firebase'

if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: 'AIzaSyBOOt8xvbTh5JAJ4kJxPD_6ohcyb0LfR7k',
    authDomain: 'genji2022.firebaseapp.com',
    databaseURL: 'https://genji2022.firebaseio.com',
    projectId: 'genji2022',
    storageBucket: 'genji2022.appspot.com',
    messagingSenderId: '52466352397',
    appId: '1:52466352397:web:cdc45cbe4b1ab3f96df044',
  })
}

export default firebase
