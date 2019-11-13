import React, { Component } from "react";
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import { Redirect } from 'react-router-dom';
import jwt_decode from "jwt-decode";
import setAuthToken from "./utils/setAuthToken";
import { setCurrentUser, logoutUser } from "./actions/authActions";

import {Provider} from "react-redux";
import store from "./store";


import Navbar from "./components/layout/Navbar";
import Landing from "./components/layout/Landing";
import About from "./components/layout/About";
import Register from "./components/auth/Register";
import Login from "./components/auth/Login";
import PasswordRecovery from "./components/auth/PasswordRecovery"
import PrivateRoute from "./components/auth/PrivateRoute"
import Profile from "./components/profile/Profile";
import Game from "./components/game/Game";
import Search from "./components/search/search"


if (localStorage.jwtToken) {
  const token = localStorage.jwtToken;
  setAuthToken(token);
  const decoded = jwt_decode(token);
  store.dispatch(setCurrentUser(decoded));
  const currentTime = Date.now() / 1000; 
  
  if (decoded.exp < currentTime) {
    store.dispatch(logoutUser());
    window.location.href = "./login";
  }
}

class App extends Component {
  render() {
    return (
      <Provider store={store}>
        <Router>
          <div className="App">
            <Navbar />
            <Route exact path="/" component={Landing} />
            <Route exact path="/about" component={About}/>
            <Route exact path="/register" component={Register} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/passwordrecovery" component={PasswordRecovery}/>
            <PrivateRoute exact path="/search/:searchQuery" component={Search}/>
            <PrivateRoute exact path="/profile/:username" component={Profile} />
            <PrivateRoute exact path="/game/:name" component={Game} />
          </div>
        </Router>
      </Provider>
    );
  }
}
export default App