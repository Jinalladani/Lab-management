from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()
hashed = bcrypt.generate_password_hash("Het@1234").decode("utf-8")
print(hashed)