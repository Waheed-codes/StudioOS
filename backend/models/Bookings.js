import mongoose from "mongoose";

let bookingSchema = new mongoose.Schema(
    {
        client_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Client",
        },
        photographer_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Team",
        },
        shootType: {
            type: String,
            required: true,
            trim: true,
            enum:["Portrait","Wedding","Event","Commercial","Family","Real Estate"],
            default:"Portrait",
        },
        date: {
            type: String,
            required: true,
            trim: true,
        },
        startTime: {
            type: String,
            required: true,
            trim: true,
        },
        endTime: {
            type: String,
            required: true,
            trim: true,
        },
        location: {
            type: String,
            required: true,
            trim: true,
        },
        totalAmount:{
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        amountPaid:{
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        status:{
            type:String,
            enum:["Confirmed","Pending","Cancelled"],
            default:"Confirmed",
        },
        notes:{
            type:String,
            default:'', 
            trim:true,  
        },

})

let bookingModel =mongoose.model("Bookings",bookingSchema)

export default bookingModel