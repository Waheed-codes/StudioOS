import mongoose from "mongoose";

const teamSchema= new mongoose.Schema(
    {
        name:{
            type:String,
            required:true,
            trim:true,
            maxLength:50,
        },

        role:{
            type:String,
            required:true,
            trim:true,
            enum:["Lead Photographer","Associate Photographer","Assistant","Editor"],
        },
        email:{
            type:String,
            required:true,
            trim:true,
            unique:true,
        },
        status:{
            type:String,
            required:true,
            enum:["Active","Inactive"],
            default:"Active",
        },

    },{timestamps:true},
)

let teamModel =  mongoose.model("Team",teamSchema)

export default teamModel