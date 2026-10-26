 import jwt from"jsonwebtoken"
import dotenv from "dotenv"
dotenv.config()
 
 async function tokenize(params) {
    try {
        const token = await jwt.sign(
                   { id: admin._id },
                   process.env.SECRET_KEY,
                   { expiresIn: "7d" }
               );
       
               return res.status(200).json({
                   message: "Login successful",
                   token
               });
        
    } catch (error) {
        consol.error(error.message)
    }
 }

 export default tokenize;
 