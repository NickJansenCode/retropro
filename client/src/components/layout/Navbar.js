import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";
import { connect } from "react-redux";
import styles from '../css/navbar.module.css';
import landing from "../../img/retroProLogo.png";
import PropTypes from "prop-types";
import { logoutUser } from "../../actions/authActions";
import Axios from "axios";
import NotificationBadge from 'react-notification-badge';

class Navbar extends Component {

    constructor() {
        super();
        this.state = {
            searchQuery: "",
            emptySearch: false,
            friendRequestCount: 0,
            isAdmin: false,
            friendRequests: []
        }
    }

    componentDidMount() {

        if (this.props.auth.isAuthenticated) {

            // Load pending friend requests for the currently logged in user. //
            Axios.post("/api/users/getFriendRequests", { userID: this.props.auth.user.id })
                .then(res => {
                    this.setState({
                        friendRequestCount: res.data.length,
                        friendRequests: res.data
                    })
                })

            Axios.get("/api/users/isUserAdmin/" + this.props.auth.user.id)
                .then(res => {
                    if (res.data === true) {
                        this.setState({
                            isAdmin: true
                        })
                    }
                })
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.auth.isAuthenticated) {
            Axios.get("/api/users/isUserBannedOrDeleted/" + nextProps.auth.user.id)
                .then(res => {
                    if (res.data === true) {
                        this.props.logoutUser()
                    }
                })

            Axios.get("/api/users/isUserAdmin/" + this.props.auth.user.id)
                .then(res => {
                    if (res.data === true) {
                        this.setState({
                            isAdmin: true
                        })
                    }
                })
        }

    }

    onChange = e => {
        this.setState({
            [e.target.id]: e.target.value
        });
    };

    onLogoutClick = e => {
        e.preventDefault();
        this.props.logoutUser();
    };

    onSearch = e => {
        e.preventDefault()
        if (!this.state.searchQuery.trim() == "") {
            this.props.history.push("/search/" + this.state.searchQuery);
        }
    }

    acceptFriendRequest = requesterID => e => {
        e.preventDefault();

        // Accept friend request and then update user's friends list and friendship status. //
        Axios.post("/api/users/acceptFriendRequest", { requesterID: requesterID, requestedID: this.props.auth.user.id })
            .then(() => {
                window.location.reload()
            })
    }

    rejectFriendRequest = requesterID => e => {
        e.preventDefault();

        Axios.post("/api/users/rejectFriendRequest", { requesterID: requesterID, requestedID: this.props.auth.user.id })
            .then(() => {
                window.location.reload()
            })
    }

    componentDidUpdate(prevProps) {
        if (this.props.location !== prevProps.location) {
            if (this.props.auth.isAuthenticated) {

                // Load pending friend requests for the currently logged in user. //
                Axios.post("/api/users/getFriendRequests", { userID: this.props.auth.user.id })
                    .then(res => {
                        this.setState({
                            friendRequestCount: res.data.length,
                            friendRequests: res.data
                        })
                    })
            }
        }
    }

    render() {
        let profileLink = `/Profile/${this.props.auth.user.name}`
        return (
            <nav className="navbar navbar-dark navbar-expand-md bg-primary">
                <a className="navbar-brand" href="/">
                    <img src={landing} height="50px" />
                </a>
                <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
                    {this.props.auth.isAuthenticated &&
                        <ul className="navbar-nav">
                            <li className="nav-item">
                                <Link className={styles.navLink} to="/" style={{ color: "white" }}>Home</Link>
                            </li>
                            <li className="nav-item">
                                <Link className={styles.navLink} to="/About" style={{ color: "white" }}>About</Link>
                            </li>
                        </ul>
                        ||
                        <ul className="navbar-nav mr-auto">
                            <li className="nav-item">
                                <Link className={styles.navLink} to="/" style={{ color: "white" }}>Home</Link>
                            </li>
                            <li className="nav-item">
                                <Link className={styles.navLink} to="/About" style={{ color: "white" }}>About</Link>
                            </li>


                            <li className="nav-item">
                                <Link className={styles.navLink} to="/Login" style={{ color: "white" }}>Login</Link>
                            </li>
                            <li className="nav-item">
                                <Link className={styles.navLink} to="/Register" style={{ color: "white" }}>Register</Link>
                            </li>
                        </ul>
                    }
                    {this.props.auth.isAuthenticated &&
                        <form className="navbar-form form-inline w-75 m-auto" role="search" onSubmit={this.onSearch}>
                            <input type="text" id="searchQuery" onChange={this.onChange} value={this.state.searchQuery} className="form-control w-75" placeholder="Search For A Game Or User" />
                            <button className="btn my-2 my-sm-0 border-secondary bg-success" type="submit">Search</button>
                        </form>
                    }
                </div>
                {this.props.auth.isAuthenticated &&
                    <ul className="navbar-nav navbar-right">
                        <li className="nav-item dropdown">
                            <div id="navbarDropdown2" role="button" data-toggle="dropdown"
                                aria-haspopup="true" className="dropdown-toggle"
                                className={styles.navLink}>
                                <i className="fas fa-bell fa-lg">
                                    <NotificationBadge count={this.state.friendRequestCount} />
                                </i>
                            </div>
                            <div className="dropdown-menu" aria-labelledby="navbarDropdown2">
                                {this.state.friendRequestCount > 0 &&
                                    this.state.friendRequests.map(request => {
                                        let profileLink = `/Profile/${request.friendA.name}`
                                        return (
                                            <div className="container">
                                                <div className="row">
                                                    <div className="col-12">
                                                        Friend Request from <Link to={profileLink}><strong>{request.friendA.name}</strong></Link>
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-s-10 col-md-4">
                                                        <button className="btn btn-danger btn-sm mr-3" onClick={this.rejectFriendRequest(request.friendA._id)}>Decline</button>
                                                    </div>
                                                    <div className="col-s-10 col-md-4">
                                                        <button className="btn btn-primary btn-sm ml-3" onClick={this.acceptFriendRequest(request.friendA._id)}>Accept</button>
                                                    </div>
                                                </div>
                                                <br />
                                            </div>
                                        )
                                    })
                                    ||
                                    <div className="container">
                                        <p class="text-muted">
                                            No friend requests... :(
                                        </p>
                                    </div>
                                }
                            </div>
                        </li>
                        <li className="nav-item dropdown">
                            <div id="navbarDropdown" role="button" data-toggle="dropdown"
                                aria-haspopup="true" className="dropdown-toggle"
                                className={styles.navLink}>
                                Logged in as {this.props.auth.user.name}
                            </div>
                            <div className="dropdown-menu" aria-labelledby="navbarDropdown">
                                <Link className="dropdown-item" to={profileLink}>Profile</Link>
                                <Link className="dropdown-item" to="/FindStore">Find A Store</Link>
                                <Link className="dropdown-item" to="/Settings">Settings</Link>
                                <Link className="dropdown-item" to="/Submit">Submit A Game</Link>
                                {this.state.isAdmin &&
                                    <Link className="dropdown-item" to="/Admin">Admin Dashboard</Link>
                                }
                                <Link className="dropdown-item" to="/" onClick={this.onLogoutClick}>
                                    Log Out
                                </Link>
                            </div>
                        </li>
                    </ul>
                }

            </nav>
        )
    }
}

Navbar.propTypes = {
    logoutUser: PropTypes.func.isRequired,
    auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    auth: state.auth,
    errors: state.errors
});

export default connect(
    mapStateToProps,
    { logoutUser }
)(withRouter(Navbar));