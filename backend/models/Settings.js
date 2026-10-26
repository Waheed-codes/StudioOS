import mongoose from "mongoose"

const settingsSchema= new mongoose.Schema(
    {
        studioName:{
            type:String,
            required:true,
            trim:true,
        },
        email:{
            type:String,
            required:true,
            trim:true,
        },
    },{timestamps:true}
)

const settingsModal = mongoose.model("Settings",settingsSchema)

export default settingsModal

