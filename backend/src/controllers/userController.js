const mongoose = require('mongoose');
const crypto = require('crypto');
const auth = require('./authController');
const mealController = require('./mealController.js');

const User = mongoose.model('User');
const Who = mongoose.model('who');

function getFabbisognoQuery(dataN, sesso) {
  const ageDiffMs = new Date().getTime() - dataN;
  const ageDate = new Date(ageDiffMs);
  const age = Math.abs(ageDate.getFullYear() - 1970);
  const s = sesso === 'm' ? 'male' : 'female';
  return {
    age_min: { $lt: age },
    age_max: { $gt: age },
    sex: s,
  };
}

/** Creates a new user */
exports.createNewUser = function createNewUser(req, res) {
  const b = req.body;
  const dataN = new Date(b.birth_date).toISOString();
  const iterations = 420;
  const keyLen = 512;
  const digest = 'sha512';
  const sale = crypto.randomBytes(512).toString();
  const pswHashSalt = crypto.pbkdf2Sync(b.password,
    sale,
    iterations,
    keyLen,
    digest).toString();

  Who.findOne(getFabbisognoQuery(new Date(b.birth_date).getTime(), b.sex)).exec().then((fab) => {
    const newUser = new User({
      username: b.username,
      password_hash_salt: pswHashSalt,
      salt: sale,
      name: b.name,
      surname: b.surname,
      birth_date: dataN,
      email: b.email,
      sex: b.sex,
      user_img_url: 'https://cdn.pixabay.com/photo/2012/04/13/21/07/user-33638_960_720.png',
      weight: parseInt(b.weight, 10),
      height: parseInt(b.height, 10),
      allergens: b.allergens,
      fabbisogno: fab,
    });
    newUser.save()
      .then((user) => {
        global.log(`User created ->${user}`); // DEBUG
        // res.status(201).json(user);
        // Init user document inside Meals collection
        mealController.initUserMeals(user.username, res);
      })
      .catch((err) => {
        global.log('createNewUser saveError: '.concat(err));
        res.status(500).send({ description: 'internal_server_error' });
      });
    //
  }).catch((e) => {
    global.log('createNewUser findWhoError: '.concat(e));
    res.status(500).send({ description: 'internal_server_error' });
  });
};

exports.checkUser = function checkUser(req, res) {
  const query = { username: req.params.username };
  res.status(200);
  User.findOne(query)
    .exec()
    .then((user) => {
      if (user !== null) {
        res.send('User already exist');
      } else {
        res.send('ok');
      }
    }).catch((err) => {
      global.log(err);
      res.status(500).send({ description: 'internal_server_error' });
    });
};

exports.checkEmail = function checkEmail(req, res) {
  const query = { email: req.params.email };
  res.status(200);
  User.findOne(query)
    .exec()
    .then((user) => {
      if (user !== null) {
        res.send('Email already exist');
      } else {
        res.send('ok');
      }
    }).catch((err) => {
      global.log(err);
      res.status(500).send({ description: 'internal_server_error' });
    });
};

/** Loads a user by username */
exports.load_user = async (req, res) => {
  // global.log(`looking for user: ${req.query.username}`); // DEBUG
  const username = auth.getUsername(req.headers.token);
  const query = { username };

  await User.findOne(query)
    .exec()
    .then((user) => {
      if (user == null) {
        res.status(404).send({ description: 'user_not_found' });
        global.log('User not found'); // DEBUG
      } else {
        res.status(200).json(user);
        global.log(`Found user ->${user.username}`); // DEBUG
      }
    })
    .catch((err) => {
      global.log(`Error while loading user: ${err}`); // DEBUG
      res.status(500).send({ description: 'internal_server_error' });
    });
};


/** Updates a user */
exports.update_user = async (req, res) => {
  const username = auth.getUsername(req.headers.token);
  const query = { username };

  const update = req.body; // passare il json utente con tutti i campi (aggiornati e non)

  await User.findOneAndUpdate(query, update, { new: true })
    .exec()
    .then((user) => {
      if (user == null) {
        res.status(400).send({ description: 'user_not_found' });
        global.log('User not found'); // DEBUG
      } else {
        res.status(200).json(user);
        global.log('user updated'); // DEBUG
      }
    })
    .catch((err) => {
      global.log(`Error while updating user: ${err}`); // DEBUG
      res.status(500).send({ description: 'internal_server_error' });
    });
};


/** Deletes a user given its username */
exports.delete_user = async (req, res) => {
  global.log(`Deleting user: ${req.query.username}`); // DEBUG
  const username = auth.getUsername(req.headers.token);
  const query = { username };

  await User.deleteOne(query)
    .exec()
    .then((user) => {
      if (user == null) {
        res.status(400).send({ description: 'user_not_found' });
        global.log(`User ${username} not found`); // DEBUG
      } else {
        res.status(200).send({ description: 'user_deleted' }); // User successfully deleted
        mealController.deleteUserMeals(username, res);
        global.log(`User ${username} deleted`); // DEBUG
      }
    })
    .catch((err) => {
      global.log(`Error while deleting user: ${err}`); // DEBUG
      res.status(500).send({ description: 'internal_server_error' });
    });
};
