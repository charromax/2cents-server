const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserInputError } = require('apollo-server');

const { SECRET_KEY } = require('../../config');
const { validateRegisterInput, validateLoginInput } = require('../../util/validators');

function generateToken(user) {
    return jwt.sign({
        id: user.id,
        email: user.email,
        username: user.username
    }, SECRET_KEY, { expiresIn: '1h' });
}

module.exports = {
    Mutation: {
        /**
         * User login
         * @param {String} username = a username
         * @param {String} password = user password
         * @throws {UserInputError}
         */
        async login(_, { username, password }) {
            // Validate user input
            // Check users existance
            // Compare passwords
            
            const { valid, errors } = validateLoginInput(username, password);
            if (!valid) {
                throw new UserInputError('Error logging in', { errors });
            }
            
            const user = await User.findOne({ username });
            if (!user) { 
                errors.general = 'User not found';
                throw new UserInputError('User not found', { errors }); 
            }
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                errors.general = 'Password is wrong';
                throw new UserInputError('Password is wrong', { errors });
            }
            const token = generateToken(user);
            return {
                ...user._doc,
                id: user._id,
                token
            };

        },

        /**
         * Register new user
         * @param {registerInput} = username, email, password and password confirmation
         * @throws {UserInputError}
         */
        async register(_,
            { registerInput: { username, email, password, confirmPassword }}) {
            // Validate user data
            // Make sure user doesn't already exist
            // Hash password and create auth token
            
            const { valid, errors } = validateRegisterInput(username, email, password, confirmPassword);
            if (!valid) {
                throw new UserInputError('Errors', { errors });
            }

            const user = await User.findOne({ username });
            if (user) {
                throw new UserInputError('Username is taken', { 
                    error: {
                        username: 'This username is taken'
                    }
                 }) 
            }

            password = await bcrypt.hash(password, 12);

            const newUser = new User({
                email,
                username,
                password,
                createdAt: new Date().toISOString()
            });

            const res = await newUser.save();
            const token = generateToken(res);

            return {
                ...res._doc,
                id: res._id,
                token
            };
        }
    }
}