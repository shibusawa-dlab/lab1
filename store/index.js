import firebase from "~/plugins/firebase";

const db = firebase.firestore();

const todoRef = db.collection("todos");

export const state = () => ({
  userUid: "",
  userName: "",
  userPic: "",
  todos: [],
  numbers: [],
  isSignedIn: false
});

export const mutations = {
  setUserUid(state, userUid) {
    state.userUid = userUid;
  },
  setUserName(state, userName) {
    state.userName = userName;
  },
  addTodo(state, todo) {
    state.todos.push(todo);
  },
  addNumber(state, value) {
    state.numbers.push(value);
  },
  clearTodo(state) {
    state.todos = [];
  },
  setSignedIn(state, value) {
    state.isSignedIn = value;
  },
  setUserPic(state, value) {
    state.userPic = value;
  }
};

export const actions = {
  login({ commit }) {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase
      .auth()
      .signInWithPopup(provider)
      .then(function(result) {
        const user = result.user;
        commit("setUserUid", user.uid);
        commit("setUserName", user.displayName);
        commit("setUserPic", user.photoURL);
      })
      .catch(function(error) {
        var errorCode = error.code;
        console.log("error : " + errorCode);
      });
  },
  fetchTodos({ commit }) {
    todoRef
      .get()
      .then(res => {
        res.forEach(doc => {
          commit("addTodo", doc.data());
        });
      })
      .catch(error => {
        console.log("error : " + error);
      });
  },
  addTodo({ commit }, todo) {
    todoRef
      .add({
        todo: todo.todo,
        limit: todo.limit
      })
      .then(function(docRef) {
        commit("addTodo", todo);
      })
      .catch(function(error) {
        console.error("Error adding document: ", error);
      });
  },

  addNumber({ commit }, number) {
    db.collection(number.parent)
      .doc(number.id)
      .set({
        values: number.values
      })
      .then(function(docRef) {
        commit("addNumber", number);
      })
      .catch(function(error) {
        console.error("Error adding document: ", error);
      });
  }
};

export const getters = {
  getUserUid(state) {
    return state.userUid;
  },
  getUserName(state) {
    return state.userName;
  },
  getTodos(state) {
    return state.todos;
  },
  getIsSignedIn(state) {
    return state.isSignedIn;
  },
  getUserPic(state) {
    return state.userPic;
  }
};
