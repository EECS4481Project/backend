const mongoose = require('mongoose');
const userSchema = require('./schema/user').userSchema;
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

let connection = mongoose;

if (process.env.NODE_ENV === 'production') {
    // TODO: Connect to prod db
} else {
    mongoose.connect(process.env.MONGO_DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'failed to connect to db:'));
    db.once('open', function () {
        console.log('connected to mongodb');
    });
}

// Add schemas to DB
const user = connection.model('User', userSchema);

// Export dao's for use
exports.user = user;
// Export mongoose for graceful disconnect later
exports.mongoose = mongoose;