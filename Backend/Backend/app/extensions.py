from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

cors = CORS()
db = SQLAlchemy()
bcrypt = Bcrypt()