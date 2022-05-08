const jwt = require('jsonwebtoken');

function checkUser (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');
    console.log("HI");
  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
      if (error) {
        return res.status(401).json({ msg: 'Token is not valid' });
      } else {
        console.log(decoded);
        req.user = decoded.user;
        if(!decoded.user.admin) {
          next();
        } else {
          res.status(401).json({ msg: 'Not a valid user' });
        }
      }
    });
  } catch (err) {
    console.error('something wrong with auth middleware');
    res.status(500).json({ msg: 'Server Error' });
  }
};

function checkAdmin (req, res, next ) {
  // Get token from header
  const token = req.header('x-auth-token');
  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
      if (error) {
        return res.status(401).json({ msg: 'Token is not valid' });
      } else {
        console.log(decoded);
        req.user = decoded.user;
        if(decoded.user.admin) {
          next();
        } else {
          res.status(401).json({ msg: 'Not a valid user' });
        }
      }
    });
  } catch (err) {
    console.error('something wrong with auth middleware');
    res.status(500).json({ msg: 'Server Error' });
  }
}

module.exports = {
    checkUser,
    checkAdmin
};
