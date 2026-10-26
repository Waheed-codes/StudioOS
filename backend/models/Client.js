import mongoose from "mongoose";


const clientSchema= new mongoose.Schema(
    {
        name:{
            type:String,
            required:true,
            trim:true,
            maxLength:50,
        },
        email:{
            type:String,
            required:true,
            trim:true,
            unique:true,
        },
        phoneNumber:{
            type:String,
            required:true,
            trim:true,
        },

        notes:{
            type:String,
            default:'',
        },
        status:{
            type:String,
            enum:["active","inactive"],
            default:"active",
        },
    },
    {timestamps:true},
) 

const clientModel= mongoose.model("Client", clientSchema)

export default clientModel