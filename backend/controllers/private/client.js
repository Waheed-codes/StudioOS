import express from "express"
import mongoose from "mongoose"
import clientModel from "../../models/Client.js"

const router = express.Router()

//GET ALL CLIENTS
router.get("/api/get-clients", async (req, res) => {
    try {
        let allClients = await clientModel.find(
            { status: "active" },
            { name: 1, email: 1, phoneNumber: 1, notes: 1, _id: 1 }
        )
        if (allClients.length === 0) {
            return res.status(200).json({ msg: "There are no clients at the moment", data:[] })
        }
        res.status(200).json({ msg: "All clients details", data: allClients })
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ msg: "Internal Server error" })
    }
})

//create client
router.post("/api/create-client", async (req, res) => {
    try {
        let { name, email, phone, phoneNumber, notes } = req.body
        if (!name || !email) {
            return res.status(400).json({ msg: "Name and email are required" })
        }
        const contact = phone || phoneNumber || ""
        const cleanEmail = email.trim().toLowerCase()
        let checkIfExists = await clientModel.findOne({ email: cleanEmail })

        if (checkIfExists) {
            if (checkIfExists.status === "inactive") {
                checkIfExists.name = name
                checkIfExists.phoneNumber = contact
                checkIfExists.notes = notes || ""
                checkIfExists.status = "active"
                await checkIfExists.save()
                return res.status(200).json({ msg: "Client reactivated successfully", data: checkIfExists, creation: checkIfExists })
            }
            return res.status(400).json({ msg: "Client Already Exists" })
        }

        let newClient = {
            name,
            email: cleanEmail,
            phoneNumber: contact,
            notes: notes || ""
        }

        let creation = await clientModel.create(newClient)
        return res.status(201).json({ msg: "Client Created Successfully", data: creation, creation })
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ msg: "Internal Server error" })
    }
})

//UPDATE-CLIENT DETAILS
router.patch("/api/edit-client-details/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: "Invalid Client ID format" });
        }
        let client = await clientModel.findById(id)
        if (!client) {
            return res.status(404).json({ msg: "Client Not Found, Create a client to edit details" })
        }
        if(client.status !== "active"){
            return res.status(400).json({ msg: `Client with ${id} is inactive, to make changes the client must be active` })
        }

        let updates = { ...req.body };
        delete updates._id;
        delete updates.id;
        if (updates.phone) {
            updates.phoneNumber = updates.phone;
            delete updates.phone;
        }
        if (updates.email) {
            updates.email = updates.email.trim().toLowerCase();
        }

        let operation = await clientModel.findOneAndUpdate(
            { _id: id },
            { $set: updates },
            { returnDocument: "after", runValidators: true }
        ).select("name email phoneNumber notes")

        return res.status(200).json({ msg: "Changes made Successfully", data: operation, operation })
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ msg: "Internal Server Error" })
    }
})

//DELETE CLIENT DETAILS
router.patch("/api/delete-client/:id", async (req, res) => {
    try {
        const id = req.params.id
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: "Invalid Client ID format" });
        }
        const client = await clientModel.findById(id)

        if (!client) {
            return res.status(404).json({ msg: "Client not found" })
        }

        if(client.status === "inactive"){
            return res.status(400).json({ msg: `Client with ${id} is already deleted` })
        }

        client.status = "inactive"
        await client.save()
        return res.status(200).json({ msg: "Client Deleted Successfully" }) 
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ msg: "Internal Server Error" })
    }
})

export default router