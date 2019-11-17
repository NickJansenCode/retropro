const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const registerValidation = require('../../validation/register');
const loginValidation = require('../../validation/login');
const User = require('../../models/User');
const Game = require('../../models/Game');
const Collection = require('../../models/Collection');
const ProfileComment = require("../../models/ProfileComment")
const PasswordRecovery = require('../../models/PasswordRecovery');
const Friendship = require("../../models/Friendship")
require('dotenv').config();

router.get('/search/:name', (req, res) => {
    User.find({ $or: [{ 'name': { $regex: '.*' + req.params.name + '.*', $options: 'i' } }, { 'tags': { $regex: req.params.name, $options: 'i' } }] })
        .then(((users) => {
            res.status(200).json(users);
        }))
        .catch((err) => {
            res.status(500).json(err);
        });
});

router.get('/getSettings/:id', (req, res) => {
    User.findOne({ _id: req.params.id })
        .then(user => {
            res.status(200).json({
                privateAccount: user.private,
                tags: user.tags,
            })
        })
})

router.post("/saveSettings", (req, res) => {
    User.findOneAndUpdate({ _id: req.body.userID }, { private: req.body.privateAccount }).then(() => {
        res.json(true)
    })
})

router.post("/addTag", (req, res) => {
    User.findByIdAndUpdate(req.body.userID, { $push: { tags: req.body.tag } })
        .then(() => {
            res.json(true)
        })
})

router.post("/removeTag", (req, res) => {
    User.findByIdAndUpdate(req.body.userID, { $pull: { tags: req.body.tag } })
        .then(() => {
            res.json(true)
        })
})

router.post('/getByName', (req, res) => {
    User.findOne({
        name: req.body.name,
    })
        .populate({
            path: 'gameCollection',
            populate: {
                path: 'reviews',
                select: 'rating'
            },
        })
        .populate({
            path: 'wishlist',
            populate: {
                path: 'reviews',
                select: 'rating'
            }
        })
        .populate({
            path: 'profileComments',
            populate: {
                path: 'commenter'
            }
        })
        .populate({
            path: 'highlights',
            populate: {
                path: 'platform'
            }
        })
        .then((user) => {
            if (user) {

                Friendship.find({ $or: [{ friendA: user._id, pending: false }, { friendB: user._id, pending: false }] })
                    .populate('friendA')
                    .populate('friendB')
                    .then((friendships) => {
                        Friendship.findOne({ $or: [{ friendA: req.body.authID, friendB: user._id }, { friendA: user._id, friendB: req.body.authID }] }).then(friendship => {
                            let friendshipStatus = ""
                            if (friendship) {

                                // You are friends. //
                                if (friendship.pending == false) {
                                    friendshipStatus = "Friends"
                                }
                                else {

                                    // If you requested them and it's still pending. //
                                    if (friendship.friendA == req.body.authID) {
                                        friendshipStatus = "Pending"
                                    }

                                    // If they requested you and it's still pending. //
                                    else {
                                        friendshipStatus = "PendingAccept"
                                    }
                                }

                                res.json({
                                    friends: friendships,
                                    friendshipStatus: friendshipStatus,
                                    user: user,
                                });

                            } else {

                                res.json({
                                    friends: friendships,
                                    friendshipStatus: friendshipStatus,
                                    user: user,
                                });
                            }
                        })
                    })

            } else {
                return res
                    .status(400)
                    .json({ message: 'Failed to find user.' });
            }
        });
});

router.post("/addComment", (req, res) => {

    const newComment = new ProfileComment({
        commenter: req.body.commenterId,
        text: req.body.comment,
        timestamp: req.body.timestamp
    })

    newComment.save().then(savedComment => {
        User.findByIdAndUpdate(req.body.commentReceiverId, { $push: { profileComments: savedComment._id } })
            .then(() => {
                User.findOne({ _id: req.body.commentReceiverId })
                    .populate({
                        path: 'profileComments',
                        populate: {
                            path: 'commenter',
                        },
                    })
                    .then((data) => {
                        res.status(200).json(data.profileComments);
                    });
            });
    });
})


/**
 * @route GET api/users/getForrPasswordRecovery
 * @desc Retrieves password recovery options for user
 */
router.get('/getForPasswordRecovery/:email', (req, res) => {
    User.findOne({
        email: req.params.email,
    })
        .populate({
            path: 'passwordrecovery',
            populate: {
                path: 'question',
            },
        })
        .then((user) => {
            if (!user) {
                return res
                    .status(400)
                    .json({ message: 'Failed to find user.' });
            }

            const passwordRecoveryData = user.passwordrecovery.map((item) => {
                return {
                    text: item.question.text,
                    answer: item.answer,
                };
            });

            res.json(passwordRecoveryData);
        });
});

/**
 * @route POST api/users/register
 * @desc Register operations for user
 * @access Public
 */
router.post('/register', (req, res) => {
    const { errors, isValid } = registerValidation(req.body);

    if (!isValid) {
        return res.status(400).json(errors);
    }

    User.findOne({
        name: req.body.name,
    })
        .then(user => {
            if (user) {
                return res.status(400).json({ name: 'Name already exists.' })
            }
            else {
                User.findOne({
                    email: req.body.email,
                }).then((user) => {
                    if (user) {
                        return res.status(400).json({ email: 'Email already exists.' });
                    } else {
                        const passwordRecovery1 = new PasswordRecovery({
                            question: req.body.recoveryQuestion1ID,
                            answer: req.body.recoveryQuestion1Answer,
                        });

                        const passwordRecovery2 = new PasswordRecovery({
                            question: req.body.recoveryQuestion2ID,
                            answer: req.body.recoveryQuestion2Answer,
                        });


                        passwordRecovery1.save().then((recovery1) => {
                            passwordRecovery2.save().then((recovery2) => {

                                const newUser = new User({
                                    name: req.body.name,
                                    email: req.body.email,
                                    password: req.body.password,
                                    passwordrecovery: [recovery1._id, recovery2._id],

                                });

                                bcrypt.genSalt(10, (err, salt) => {
                                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                                        if (err) throw err;
                                        newUser.password = hash;
                                        newUser
                                            .save()
                                            .then((user) => {
                                                res.json(user);
                                            })
                                            .catch((err) => console.log(err));
                                    });
                                });

                            });
                        });
                    }
                });
            }
        })

});

router.post('/updatePassword', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    User.findOne({ email }).then((user) => {
        if (!user) {
            res.status(400).json('User not found.');
        }

        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, (err, hash) => {
                if (err) throw err;
                user.password = hash;

                user.save().then(() => {
                    return res.status(200).json('Success');
                })
            });
        });
    });
});

// @route POST api/users/login
// @desc Login user and return JWT token
// @access Public
router.post('/login', (req, res) => {
    // Form validation
    const { errors, isValid } = loginValidation(req.body);
    // Check validation
    if (!isValid) {
        return res.status(400).json(errors);
    }
    const email = req.body.email;
    const password = req.body.password;
    // Find user by email
    User.findOne({ email })
        .populate({
            path: 'role',
        })
        .then((user) => {
            // Check if user exists
            if (!user) {
                return res.status(404).json({ emailnotfound: 'Email not found' });
            }
            // Check password
            bcrypt.compare(password, user.password).then((isMatch) => {
                if (isMatch) {
                    // User matched
                    // Create JWT Payload
                    const payload = {
                        id: user.id,
                        name: user.name,
                        role: user.role.name,
                        profilePicture: user.profilepicture,
                    };
                    // Sign token
                    jwt.sign(
                        payload,
                        process.env.JWTSECRET,
                        {
                            expiresIn: 31556926, // 1 year in seconds
                        },
                        (err, token) => {
                            res.json({
                                success: true,
                                token: 'Bearer ' + token,
                            });
                        },
                    );
                } else {
                    return res
                        .status(400)
                        .json({ passwordincorrect: 'Password incorrect' });
                }
            });
        });
});

router.post("/updateUser", (req, res) => {
    User.findByIdAndUpdate(req.body.userId, { profilepicture: req.body.profilePictureURL, about: req.body.about, headerpicture: req.body.headerImageURL }).then(() => {

        User.findOne({ _id: req.body.userId })
            .populate({
                path: 'gameCollection',
                populate: {
                    path: 'reviews',
                    select: 'rating'
                },
            })
            .populate({
                path: 'wishlist',
                populate: {
                    path: 'reviews',
                    select: 'rating'
                }
            })
            .populate({
                path: 'highlights', populate: { path: 'platform' }
            })
            .populate({
                path: 'profileComments',
                populate: {
                    path: 'commenter'
                }
            })
            .then((data) => {
                res.status(200).json({ "user": data });
            });

    })
})

router.get("/getAuthUserProfilePicture/:id", (req, res) => {
    User.findOne({ _id: req.params.id })
        .then((user) => {
            res.status(200).json(user.profilepicture)
        })
})

router.post("/addGameToHighlights", (req, res) => {
    User.findByIdAndUpdate(req.body.userID, { $push: { highlights: req.body.gameID } })
        .then(user => {
            User.findById(req.body.userID)
                .populate({
                    path: 'highlights',
                    populate: {
                        path: 'platform'
                    }
                })
                .then(popUser => {
                    res.json(popUser.highlights)
                })

        })
})

router.post("/removeGameFromHighlights", (req, res) => {
    User.findByIdAndUpdate(req.body.userID, { $pull: { highlights: req.body.gameID } })
        .then(user => {
            User.findById(req.body.userID)
                .populate({
                    path: 'highlights',
                    populate: {
                        path: 'platform'
                    }
                })
                .then(popUser => {
                    res.json(popUser.highlights)
                })

        })
})

router.post("/removeGameFromWishlist", (req, res) => {
    User.findByIdAndUpdate(req.body.userID, { $pull: { wishlist: req.body.gameID } })
        .then(user => {
            User.findById(req.body.userID)
                .populate({
                    path: 'wishlist',
                    populate: {
                        path: 'reviews',
                        select: 'rating'
                    }
                })
                .then(popUser => {
                    res.json(popUser.wishlist)
                })

        })
})

router.post("/sendFriendRequest", (req, res) => {
    const newFriendRequest = new Friendship({
        friendA: req.body.requesterID,
        friendB: req.body.requestedID
    })

    newFriendRequest.save().then(value => {
        return res.status(200).json(true)
    })
})

/**
 * Accepts a friend request. Finds a friend request
 * from the requesting user to the requested user and sets its pending state to 
 * false. Then finds the friends for the requester and returns
 * their details. (profile purposes)
 */
router.post("/acceptFriendRequest", (req, res) => {

    Friendship.findOneAndUpdate({
        friendA: req.body.requesterID,
        friendB: req.body.requestedID
    }, {
        pending: false
    }, (friendship) => {

        // Find all the friends for the user who's profile we're on. //
        Friendship.find({ $or: [{ friendA: req.body.requesterID }, { friendB: req.body.requesterID }] })
            .populate({
                path: 'friendA'
            })
            .populate({
                path: 'friendB'
            })
            .then(friendships => {
                return res.json(friendships)
            })
    })
})

/**
 * Rejects a friend request. Finds and deletes a friend request
 * from the requesting user to the requested user. Then finds the friends
 * for the requester and returns their details. 
 */
router.post("/rejectFriendRequest", (req, res) => {

    Friendship.findOneAndDelete({
        friendA: req.body.requesterID,
        friendB: req.body.requestedID
    }, (friendship) => {

        // Find all the friends for the user who's profile we're on. //
        Friendship.find({ $or: [{ friendA: req.body.requesterID }, { friendB: req.body.requesterID }] })
            .populate({
                path: 'friendA'
            })
            .populate({
                path: 'friendB'
            })
            .then(friendships => {
                return res.json(friendships)
            })
    })
})

/**
 * Removes a friendship between two users. Finds the friends 
 * for user A and returns their details. (profile purposes)
 */
router.post("/removeFromFriends", (req, res) => {
    Friendship.findOneAndDelete({ $or: [{ friendA: req.body.friendA, friendB: req.body.friendB }, { friendA: req.body.friendB, friendB: req.body.friendA }] })
        .then(() => {
            Friendship.find({ $or: [{ friendA: req.body.friendA }, { friendB: req.body.friendA }] })
                .populate({
                    path: 'friendA'
                })
                .populate({
                    path: 'friendB'
                })
                .then(friendships => {
                    return res.json(friendships)
                })
        })
})

/**
 * Loads all pending friend requests to a user.
 */
router.post("/getFriendRequests", (req, res) => {
    Friendship.find({
        friendB: req.body.userID,
        pending: true
    })
        .populate({
            path: "friendA"
        })
        .then(requests => {
            if (!requests) {
                return res.json([])
            }
            return res.json(requests)
        })
})
module.exports = router;
