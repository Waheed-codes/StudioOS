import express from "express"
import mongoose from "mongoose"
import teamModel from "../../models/Team.js"

const router = express.Router()

router.get("/api/get-all-members", async(req,res)=>{
    try {
        let allTeam= await teamModel.find(
            {status:"Active"},
            {name:1, role:1, email:1, status:1, _id:1}
        )

        if(allTeam.length===0){
            return res.status(200).json({msg:"There are no team-members at the moment", data: []})
        }

        res.status(200).json({msg:"All team members details",data:allTeam})
        
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({msg:"Internal Server Error"})
    }
})

//Add member
router.post("/api/add-member", async(req,res)=>{
    try {
        let {name,role,email}=req.body
        if (!name || !role || !email) {
            return res.status(400).json({ msg: "Name, role, and email are required" })
        }
        const cleanEmail = email.trim().toLowerCase()
        let checkIfExists = await teamModel.findOne({ email: cleanEmail })

        if (checkIfExists) {
            if (checkIfExists.status === "Inactive") {
                checkIfExists.name = name
                checkIfExists.role = role
                checkIfExists.status = "Active"
                await checkIfExists.save()
                return res.status(200).json({ msg: "Team member reactivated successfully", data: checkIfExists })
            }
            return res.status(409).json({msg:"Team member already exists"})
        }

        let newMember={
            name,
            role,
            email: cleanEmail,
            status: "Active"
        }
        let create = await teamModel.create(newMember)
        return res.status(201).json({msg:"Team member added succesfully", data:create})
        
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({msg:"Internal Server Error"})
    }
})

//Edit Details
router.patch("/api/update-details/:id", async(req,res)=>{
    try {
        const id = req.params.id
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: "Invalid Team Member ID format" })
        }
        let team = await teamModel.findById(id)
        if(!team){
            return res.status(404).json({msg:"Team member not found"})
        }

        if(team.status !== "Active"){
            return res.status(400).json({msg:`Team member with ${id} is inactive, to make changes the team member must be active`})
        }

        let updates = { ...req.body };
        delete updates._id;
        delete updates.id;
        if (updates.email) updates.email = updates.email.trim().toLowerCase();

        let operation = await teamModel.findOneAndUpdate(
            { _id: id },
            { $set: updates },
            { returnDocument: "after", runValidators: true }
        ).select("name role email status")

        return res.status(200).json({ msg: "Changes made Successfully", data: operation })

    } catch (error) {
        console.error(error.message)
        return res.status(500).json({msg:"Internal Server Error"})
    }
})

//DELETE_TEAM MEMBER
router.patch("/api/delete-member/:id", async(req,res)=>{
    try {
        let id = req.params.id
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: "Invalid Team Member ID format" })
        }
        const team = await teamModel.findById(id)
        if(!team){
            return res.status(404).json({msg:"Team member not found"})
        }

        if(team.status === "Inactive"){
            return res.status(400).json({msg:`Team member with ${id} is already deleted`})
        }

        team.status = "Inactive"
        await team.save()
        return res.status(200).json({msg:"Team member deleted successfully"})
 
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({msg:"Internal Server Error"})
    }
})

export default router
